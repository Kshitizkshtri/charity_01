import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Charity } from "../target/types/charity";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("charity-donation-system", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Charity as Program<Charity>;

  const admin = provider.wallet as anchor.Wallet;
  const orgWallet = anchor.web3.Keypair.generate();
  const donorWallet = anchor.web3.Keypair.generate();

  let platformPda: PublicKey;
  let platformTreasuryPda: PublicKey;
  let organizationPda: PublicKey;
  let campaignPda: PublicKey;
  let campaignVaultPda: PublicKey;

  before(async () => {
    // Airdrop SOL to test wallets
    await provider.connection.requestAirdrop(
      orgWallet.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      donorWallet.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await new Promise((r) => setTimeout(r, 1000));

    [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );
    [platformTreasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_treasury")],
      program.programId
    );
    [organizationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), orgWallet.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the platform", async () => {
    await program.methods
      .initializePlatform(200) // 2% fee
      .accounts({
        platform: platformPda,
        platformTreasury: platformTreasuryPda,
        authority: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const platform = await program.account.platform.fetch(platformPda);
    assert.equal(platform.feeBps, 200);
    assert.equal(platform.totalDonated.toNumber(), 0);
    console.log("✅ Platform initialized with 2% fee");
  });

  it("Registers an organization", async () => {
    await program.methods
      .registerOrganization(
        "Nepal Earthquake Relief Fund",
        "Providing immediate aid to earthquake victims in rural Nepal",
        "QmTestCID123456789"
      )
      .accounts({
        organization: organizationPda,
        authority: orgWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([orgWallet])
      .rpc();

    const org = await program.account.organization.fetch(organizationPda);
    assert.equal(org.name, "Nepal Earthquake Relief Fund");
    assert.equal(org.isVerified, false);
    console.log("✅ Organization registered (pending verification)");
  });

  it("Admin verifies the organization", async () => {
    await program.methods
      .verifyOrganization(true)
      .accounts({
        platform: platformPda,
        organization: organizationPda,
        authority: admin.publicKey,
      })
      .rpc();

    const org = await program.account.organization.fetch(organizationPda);
    assert.equal(org.isVerified, true);
    console.log("✅ Organization verified by admin");
  });

  it("Creates a campaign with milestones", async () => {
    const platform = await program.account.platform.fetch(platformPda);
    const campaignCount = platform.campaignCount.toNumber() + 1;

    [campaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        organizationPda.toBuffer(),
        Buffer.from(new anchor.BN(campaignCount).toArray("le", 8)),
      ],
      program.programId
    );
    [campaignVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign_vault"), campaignPda.toBuffer()],
      program.programId
    );

    const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

    await program.methods
      .createCampaign(
        "Rebuild Schools in Sindhupalchok",
        "Rebuilding 3 primary schools destroyed in the 2024 floods",
        "QmImageCID987654321",
        new anchor.BN(10 * LAMPORTS_PER_SOL),
        new anchor.BN(deadline),
        [
          { releasePct: 30, description: "Foundation and groundwork complete" },
          { releasePct: 40, description: "Walls and roof constructed" },
          { releasePct: 30, description: "Interior and furnishing done" },
        ]
      )
      .accounts({
        platform: platformPda,
        organization: organizationPda,
        campaign: campaignPda,
        campaignVault: campaignVaultPda,
        authority: orgWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([orgWallet])
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);
    assert.equal(campaign.title, "Rebuild Schools in Sindhupalchok");
    assert.equal(campaign.milestones.length, 3);
    assert.equal(campaign.isActive, true);
    console.log("✅ Campaign created with 3 milestones");
  });

  it("Donor donates to campaign", async () => {
    const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const platform = await program.account.platform.fetch(platformPda);

    const [donationRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("donation"),
        donorWallet.publicKey.toBuffer(),
        campaignPda.toBuffer(),
        Buffer.from(platform.totalDonated.toArray("le", 8)),
      ],
      program.programId
    );

    await program.methods
      .donate(donationAmount, "Keep up the great work! From Kathmandu")
      .accounts({
        platform: platformPda,
        organization: organizationPda,
        campaign: campaignPda,
        campaignVault: campaignVaultPda,
        platformTreasury: platformTreasuryPda,
        donationRecord: donationRecordPda,
        donor: donorWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donorWallet])
      .rpc();

    const record = await program.account.donationRecord.fetch(donationRecordPda);
    assert.equal(record.amountLamports.toNumber(), LAMPORTS_PER_SOL);
    // Net should be 98% (2% fee)
    assert.equal(record.netLamports.toNumber(), 0.98 * LAMPORTS_PER_SOL);
    console.log("✅ Donation of 1 SOL recorded (0.02 SOL fee taken)");
  });

  it("Releases milestone funds with evidence", async () => {
    const campaign = await program.account.campaign.fetch(campaignPda);
    const [milestoneReleasePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone_release"),
        campaignPda.toBuffer(),
        Buffer.from([campaign.currentMilestone]),
      ],
      program.programId
    );

    await program.methods
      .releaseMilestoneFunds("QmEvidenceCID111")
      .accounts({
        campaign: campaignPda,
        campaignVault: campaignVaultPda,
        organizationWallet: orgWallet.publicKey,
        milestoneRelease: milestoneReleasePda,
        authority: orgWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([orgWallet])
      .rpc();

    const release = await program.account.milestoneRelease.fetch(
      milestoneReleasePda
    );
    assert.equal(release.milestoneIndex, 0);
    console.log(
      `✅ Milestone 0 released: ${release.amountReleased.toNumber() / LAMPORTS_PER_SOL} SOL`
    );
  });
});
