use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("CHARiTY1111111111111111111111111111111111111");

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
#[program]
pub mod charity {
    use super::*;

    // ── Platform Admin ────────────────────────────────────────────────────────

    /// Initialize the platform once (called by the deployer).
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_fee_bps: u16, // basis points, e.g. 200 = 2 %
    ) -> Result<()> {
        require!(platform_fee_bps <= 1000, CharityError::FeeTooHigh);
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.fee_bps = platform_fee_bps;
        platform.total_donated = 0;
        platform.campaign_count = 0;
        platform.bump = ctx.bumps.platform;
        emit!(PlatformInitialized {
            authority: platform.authority,
            fee_bps: platform_fee_bps,
        });
        Ok(())
    }

    // ── Organization ──────────────────────────────────────────────────────────

    /// Register a charity organisation (pending admin verification).
    pub fn register_organization(
        ctx: Context<RegisterOrganization>,
        name: String,
        description: String,
        ipfs_docs_cid: String, // IPFS CID for verification documents
    ) -> Result<()> {
        require!(name.len() <= 64, CharityError::NameTooLong);
        require!(description.len() <= 256, CharityError::DescriptionTooLong);
        require!(ipfs_docs_cid.len() <= 64, CharityError::CidTooLong);

        let org = &mut ctx.accounts.organization;
        org.authority = ctx.accounts.authority.key();
        org.name = name.clone();
        org.description = description;
        org.ipfs_docs_cid = ipfs_docs_cid;
        org.is_verified = false;
        org.total_raised = 0;
        org.bump = ctx.bumps.organization;

        emit!(OrganizationRegistered {
            authority: org.authority,
            name,
        });
        Ok(())
    }

    /// Platform admin verifies (or revokes) an organisation.
    pub fn verify_organization(
        ctx: Context<VerifyOrganization>,
        verified: bool,
    ) -> Result<()> {
        let org = &mut ctx.accounts.organization;
        org.is_verified = verified;
        emit!(OrganizationVerified {
            organization: org.authority,
            verified,
        });
        Ok(())
    }

    // ── Campaign ──────────────────────────────────────────────────────────────

    /// Create a fundraising campaign. Organisation must be verified.
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        title: String,
        description: String,
        ipfs_image_cid: String,
        goal_lamports: u64,
        deadline_timestamp: i64,
        milestones: Vec<Milestone>,
    ) -> Result<()> {
        require!(
            ctx.accounts.organization.is_verified,
            CharityError::OrganizationNotVerified
        );
        require!(title.len() <= 64, CharityError::NameTooLong);
        require!(description.len() <= 512, CharityError::DescriptionTooLong);
        require!(goal_lamports > 0, CharityError::InvalidGoal);
        require!(milestones.len() <= 10, CharityError::TooManyMilestones);

        let clock = Clock::get()?;
        require!(
            deadline_timestamp > clock.unix_timestamp,
            CharityError::InvalidDeadline
        );

        // Validate milestone percentages sum to 100
        let total_pct: u8 = milestones.iter().map(|m| m.release_pct).sum();
        require!(total_pct == 100, CharityError::InvalidMilestonePct);

        let platform = &mut ctx.accounts.platform;
        platform.campaign_count += 1;

        let campaign = &mut ctx.accounts.campaign;
        campaign.organization = ctx.accounts.organization.key();
        campaign.title = title.clone();
        campaign.description = description;
        campaign.ipfs_image_cid = ipfs_image_cid;
        campaign.goal_lamports = goal_lamports;
        campaign.raised_lamports = 0;
        campaign.deadline = deadline_timestamp;
        campaign.is_active = true;
        campaign.milestones = milestones;
        campaign.current_milestone = 0;
        campaign.bump = ctx.bumps.campaign;
        campaign.campaign_id = platform.campaign_count;

        emit!(CampaignCreated {
            campaign_id: campaign.campaign_id,
            organization: campaign.organization,
            title,
            goal_lamports,
        });
        Ok(())
    }

    // ── Donations ─────────────────────────────────────────────────────────────

    /// Donate SOL to a campaign. Stores donation record on-chain.
    pub fn donate(
        ctx: Context<Donate>,
        amount_lamports: u64,
        message: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.campaign.is_active,
            CharityError::CampaignInactive
        );
        require!(amount_lamports > 0, CharityError::InvalidAmount);
        require!(message.len() <= 128, CharityError::MessageTooLong);

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp <= ctx.accounts.campaign.deadline,
            CharityError::CampaignExpired
        );

        // Calculate platform fee
        let platform = &ctx.accounts.platform;
        let fee = (amount_lamports as u128)
            .checked_mul(platform.fee_bps as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;
        let net_amount = amount_lamports.checked_sub(fee).unwrap();

        // Transfer net donation to campaign vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.donor.to_account_info(),
                    to: ctx.accounts.campaign_vault.to_account_info(),
                },
            ),
            net_amount,
        )?;

        // Transfer fee to platform treasury
        if fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.donor.to_account_info(),
                        to: ctx.accounts.platform_treasury.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Update campaign state
        let campaign = &mut ctx.accounts.campaign;
        campaign.raised_lamports = campaign
            .raised_lamports
            .checked_add(net_amount)
            .unwrap();

        // Update platform stats
        let platform = &mut ctx.accounts.platform;
        platform.total_donated = platform
            .total_donated
            .checked_add(amount_lamports)
            .unwrap();

        // Update organization stats
        let org = &mut ctx.accounts.organization;
        org.total_raised = org.total_raised.checked_add(net_amount).unwrap();

        // Record donation
        let record = &mut ctx.accounts.donation_record;
        record.donor = ctx.accounts.donor.key();
        record.campaign = ctx.accounts.campaign.key();
        record.amount_lamports = amount_lamports;
        record.net_lamports = net_amount;
        record.timestamp = clock.unix_timestamp;
        record.message = message.clone();
        record.bump = ctx.bumps.donation_record;

        emit!(DonationMade {
            donor: record.donor,
            campaign: record.campaign,
            amount_lamports,
            net_lamports: net_amount,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    // ── Fund Release (Milestone-Based) ────────────────────────────────────────

    /// Organisation requests release for the current milestone.
    /// Automatically releases funds if milestone percentage is met.
    pub fn release_milestone_funds(
        ctx: Context<ReleaseMilestoneFunds>,
        evidence_ipfs_cid: String, // IPFS CID of proof/report
    ) -> Result<()> {
        require!(evidence_ipfs_cid.len() <= 64, CharityError::CidTooLong);

        let campaign = &mut ctx.accounts.campaign;
        let idx = campaign.current_milestone as usize;
        require!(idx < campaign.milestones.len(), CharityError::NoMoreMilestones);

        let milestone = campaign.milestones[idx].clone();
        let pct = milestone.release_pct as u64;

        // Calculate releasable amount
        let releasable = campaign
            .raised_lamports
            .checked_mul(pct)
            .unwrap()
            .checked_div(100)
            .unwrap();

        require!(
            ctx.accounts.campaign_vault.lamports() >= releasable,
            CharityError::InsufficientVaultFunds
        );

        // Transfer from vault (PDA) to organisation wallet
        let seeds: &[&[u8]] = &[
            b"campaign_vault",
            campaign.to_account_info().key.as_ref(),
            &[ctx.bumps.campaign_vault],
        ];
        let signer = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.campaign_vault.to_account_info(),
                    to: ctx.accounts.organization_wallet.to_account_info(),
                },
                signer,
            ),
            releasable,
        )?;

        // Record release
        let release = &mut ctx.accounts.milestone_release;
        release.campaign = campaign.key();
        release.milestone_index = idx as u8;
        release.amount_released = releasable;
        release.evidence_cid = evidence_ipfs_cid.clone();
        release.timestamp = Clock::get()?.unix_timestamp;
        release.bump = ctx.bumps.milestone_release;

        campaign.current_milestone += 1;

        emit!(MilestoneReleased {
            campaign: campaign.key(),
            milestone_index: idx as u8,
            amount_released: releasable,
            evidence_cid: evidence_ipfs_cid,
        });
        Ok(())
    }

    // ── Campaign Close ────────────────────────────────────────────────────────

    /// Admin or org can close a campaign (deactivate it).
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        ctx.accounts.campaign.is_active = false;
        emit!(CampaignClosed {
            campaign: ctx.accounts.campaign.key(),
        });
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS (PDAs)
// ─────────────────────────────────────────────────────────────────────────────

#[account]
pub struct Platform {
    pub authority: Pubkey,   // 32
    pub fee_bps: u16,        // 2
    pub total_donated: u64,  // 8
    pub campaign_count: u64, // 8
    pub bump: u8,            // 1
}
impl Platform {
    pub const LEN: usize = 8 + 32 + 2 + 8 + 8 + 1;
}

#[account]
pub struct Organization {
    pub authority: Pubkey,      // 32
    pub name: String,           // 4 + 64
    pub description: String,    // 4 + 256
    pub ipfs_docs_cid: String,  // 4 + 64
    pub is_verified: bool,      // 1
    pub total_raised: u64,      // 8
    pub bump: u8,               // 1
}
impl Organization {
    pub const LEN: usize = 8 + 32 + (4 + 64) + (4 + 256) + (4 + 64) + 1 + 8 + 1;
}

#[account]
pub struct Campaign {
    pub organization: Pubkey,      // 32
    pub campaign_id: u64,          // 8
    pub title: String,             // 4 + 64
    pub description: String,       // 4 + 512
    pub ipfs_image_cid: String,    // 4 + 64
    pub goal_lamports: u64,        // 8
    pub raised_lamports: u64,      // 8
    pub deadline: i64,             // 8
    pub is_active: bool,           // 1
    pub milestones: Vec<Milestone>,// 4 + 10*(1+1+4+64)
    pub current_milestone: u8,     // 1
    pub bump: u8,                  // 1
}
impl Campaign {
    pub const LEN: usize = 8 + 32 + 8 + (4+64) + (4+512) + (4+64) + 8 + 8 + 8 + 1
        + (4 + 10 * (1 + 1 + 4 + 64)) + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Milestone {
    pub release_pct: u8,       // percentage of raised funds to release
    pub description: String,   // what must be achieved
}

#[account]
pub struct DonationRecord {
    pub donor: Pubkey,          // 32
    pub campaign: Pubkey,       // 32
    pub amount_lamports: u64,   // 8
    pub net_lamports: u64,      // 8
    pub timestamp: i64,         // 8
    pub message: String,        // 4 + 128
    pub bump: u8,               // 1
}
impl DonationRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + (4 + 128) + 1;
}

#[account]
pub struct MilestoneRelease {
    pub campaign: Pubkey,        // 32
    pub milestone_index: u8,     // 1
    pub amount_released: u64,    // 8
    pub evidence_cid: String,    // 4 + 64
    pub timestamp: i64,          // 8
    pub bump: u8,                // 1
}
impl MilestoneRelease {
    pub const LEN: usize = 8 + 32 + 1 + 8 + (4 + 64) + 8 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTION CONTEXTS
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = Platform::LEN,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,

    /// CHECK: platform treasury receives fees
    #[account(
        mut,
        seeds = [b"platform_treasury"],
        bump
    )]
    pub platform_treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterOrganization<'info> {
    #[account(
        init,
        payer = authority,
        space = Organization::LEN,
        seeds = [b"organization", authority.key().as_ref()],
        bump
    )]
    pub organization: Account<'info, Organization>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyOrganization<'info> {
    #[account(seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub organization: Account<'info, Organization>,

    #[account(address = platform.authority)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateCampaign<'info> {
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"organization", organization.authority.as_ref()],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        init,
        payer = authority,
        space = Campaign::LEN,
        seeds = [b"campaign", organization.key().as_ref(), &(platform.campaign_count + 1).to_le_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: PDA vault to hold SOL for this campaign
    #[account(
        mut,
        seeds = [b"campaign_vault", campaign.key().as_ref()],
        bump
    )]
    pub campaign_vault: UncheckedAccount<'info>,

    #[account(mut, address = organization.authority)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount_lamports: u64, message: String)]
pub struct Donate<'info> {
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"organization", organization.authority.as_ref()],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: Vault PDA receives net donation
    #[account(
        mut,
        seeds = [b"campaign_vault", campaign.key().as_ref()],
        bump
    )]
    pub campaign_vault: UncheckedAccount<'info>,

    /// CHECK: Platform treasury receives fees
    #[account(
        mut,
        seeds = [b"platform_treasury"],
        bump
    )]
    pub platform_treasury: UncheckedAccount<'info>,

    #[account(
        init,
        payer = donor,
        space = DonationRecord::LEN,
        seeds = [b"donation", donor.key().as_ref(), campaign.key().as_ref(), &platform.total_donated.to_le_bytes()],
        bump
    )]
    pub donation_record: Account<'info, DonationRecord>,

    #[account(mut)]
    pub donor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseMilestoneFunds<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: Vault from which funds are released
    #[account(
        mut,
        seeds = [b"campaign_vault", campaign.key().as_ref()],
        bump
    )]
    pub campaign_vault: UncheckedAccount<'info>,

    /// CHECK: Organization wallet receives released funds
    #[account(mut)]
    pub organization_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = MilestoneRelease::LEN,
        seeds = [b"milestone_release", campaign.key().as_ref(), &[campaign.current_milestone]],
        bump
    )]
    pub milestone_release: Account<'info, MilestoneRelease>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    #[account(address = platform.authority)]
    pub authority: Signer<'info>,
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub fee_bps: u16,
}

#[event]
pub struct OrganizationRegistered {
    pub authority: Pubkey,
    pub name: String,
}

#[event]
pub struct OrganizationVerified {
    pub organization: Pubkey,
    pub verified: bool,
}

#[event]
pub struct CampaignCreated {
    pub campaign_id: u64,
    pub organization: Pubkey,
    pub title: String,
    pub goal_lamports: u64,
}

#[event]
pub struct DonationMade {
    pub donor: Pubkey,
    pub campaign: Pubkey,
    pub amount_lamports: u64,
    pub net_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneReleased {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub amount_released: u64,
    pub evidence_cid: String,
}

#[event]
pub struct CampaignClosed {
    pub campaign: Pubkey,
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum CharityError {
    #[msg("Platform fee cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Name is too long (max 64 chars)")]
    NameTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("IPFS CID is too long (max 64 chars)")]
    CidTooLong,
    #[msg("Organization is not verified yet")]
    OrganizationNotVerified,
    #[msg("Goal must be greater than 0")]
    InvalidGoal,
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    #[msg("Milestone release percentages must sum to 100")]
    InvalidMilestonePct,
    #[msg("Too many milestones (max 10)")]
    TooManyMilestones,
    #[msg("Campaign is not active")]
    CampaignInactive,
    #[msg("Campaign deadline has passed")]
    CampaignExpired,
    #[msg("Donation amount must be > 0")]
    InvalidAmount,
    #[msg("Message is too long (max 128 chars)")]
    MessageTooLong,
    #[msg("No more milestones to release")]
    NoMoreMilestones,
    #[msg("Insufficient funds in campaign vault")]
    InsufficientVaultFunds,
}
