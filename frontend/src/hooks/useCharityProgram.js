import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  process.env.REACT_APP_PROGRAM_ID || "CHARiTY1111111111111111111111111111111111111"
);

// ── PDA helpers ───────────────────────────────────────────────────────────────
export const getPlatformPDA = () =>
  PublicKey.findProgramAddressSync([Buffer.from("platform")], PROGRAM_ID);

export const getPlatformTreasuryPDA = () =>
  PublicKey.findProgramAddressSync([Buffer.from("platform_treasury")], PROGRAM_ID);

export const getOrganizationPDA = (authorityPubkey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), authorityPubkey.toBuffer()],
    PROGRAM_ID
  );

export const getCampaignPDA = (orgPDA, campaignId) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("campaign"),
      orgPDA.toBuffer(),
      Buffer.from(new anchor.BN(campaignId).toArray("le", 8)),
    ],
    PROGRAM_ID
  );

export const getCampaignVaultPDA = (campaignPDA) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("campaign_vault"), campaignPDA.toBuffer()],
    PROGRAM_ID
  );

export const getDonationRecordPDA = (donorPubkey, campaignPDA, totalDonated) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("donation"),
      donorPubkey.toBuffer(),
      campaignPDA.toBuffer(),
      Buffer.from(new anchor.BN(totalDonated).toArray("le", 8)),
    ],
    PROGRAM_ID
  );

// ── Lamports helper ───────────────────────────────────────────────────────────
export const solToLamports = (sol) =>
  new anchor.BN(Math.floor(parseFloat(sol) * LAMPORTS_PER_SOL));

export const lamportsToSol = (lamports) =>
  (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCharityProgram(idl) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const getProgram = useCallback(() => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new anchor.Program(idl, PROGRAM_ID, provider);
  }, [connection, wallet, idl]);

  // ── Donate to a campaign ──────────────────────────────────────────────────
  const donate = useCallback(
    async ({ campaignPDA, campaignVaultPDA, orgPDA, amountSol, message }) => {
      const program = getProgram();
      const [platformPDA] = getPlatformPDA();
      const [platformTreasuryPDA] = getPlatformTreasuryPDA();

      const platform = await program.account.platform.fetch(platformPDA);
      const [donationRecordPDA] = getDonationRecordPDA(
        wallet.publicKey,
        campaignPDA,
        platform.totalDonated
      );

      const organization = await program.account.campaign.fetch(campaignPDA);
      const orgAccount = organization.organization;

      const tx = await program.methods
        .donate(solToLamports(amountSol), message || "")
        .accounts({
          platform: platformPDA,
          organization: orgAccount,
          campaign: campaignPDA,
          campaignVault: campaignVaultPDA,
          platformTreasury: platformTreasuryPDA,
          donationRecord: donationRecordPDA,
          donor: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { tx, donationRecordPDA };
    },
    [getProgram, wallet.publicKey]
  );

  // ── Register organization ─────────────────────────────────────────────────
  const registerOrganization = useCallback(
    async ({ name, description, ipfsDocsCid }) => {
      const program = getProgram();
      const [orgPDA] = getOrganizationPDA(wallet.publicKey);

      const tx = await program.methods
        .registerOrganization(name, description, ipfsDocsCid)
        .accounts({
          organization: orgPDA,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { tx, orgPDA };
    },
    [getProgram, wallet.publicKey]
  );

  // ── Fetch campaign data from chain ────────────────────────────────────────
  const fetchCampaign = useCallback(
    async (campaignPDA) => {
      const program = getProgram();
      return program.account.campaign.fetch(campaignPDA);
    },
    [getProgram]
  );

  return { donate, registerOrganization, fetchCampaign, getProgram };
}
