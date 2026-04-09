const { ethers } = require('ethers');
const crypto = require('crypto');

// ABI matching the new CivicSense.sol (3-step lifecycle)
const CONTRACT_ABI = [
  "function reportCase(string calldata _caseId, bytes32 _dataHash) external",
  "function adminResolve(string calldata _caseId) external",
  "function userConfirm(string calldata _caseId) external",
  "function getCase(string calldata _caseId) external view returns (bytes32 dataHash, uint256 reportedAt, uint256 resolvedAt, uint256 confirmedAt, uint8 status)",
  "function caseExists(string calldata _caseId) external view returns (bool)",
  "function getTotalCases() external view returns (uint256)",
  "event CaseReported(string indexed caseId, bytes32 dataHash, uint256 timestamp)",
  "event CaseResolved(string indexed caseId, uint256 timestamp)",
  "event CaseConfirmed(string indexed caseId, uint256 timestamp)"
];

// ── Helpers ─────────────────────────────────────────────────
function isBlockchainConfigured() {
  return !!(
    process.env.SEPOLIA_RPC_URL &&
    process.env.CONTRACT_ADDRESS &&
    process.env.PRIVATE_KEY
  );
}

const getProvider = () => new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const getContract = () => {
  const provider = getProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
};

const generateHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// Convert a hex-string hash (64 chars) to bytes32 for the contract
const toBytes32 = (hexString) => '0x' + hexString;

// ── 1. Report case on-chain ─────────────────────────────────
const reportCaseOnChain = async (caseId, complaintData) => {
  if (!isBlockchainConfigured()) return null;

  const hash = generateHash(complaintData);
  const contract = getContract();

  const tx = await contract.reportCase(caseId, toBytes32(hash));
  console.log(`⛓️  TX sent: ${tx.hash} (reportCase)`);
  const receipt = await tx.wait();
  console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);

  return {
    hash,
    transactionId: receipt.hash,
    blockNumber: Number(receipt.blockNumber)
  };
};

// ── 2. Admin resolves on-chain ──────────────────────────────
const adminResolveOnChain = async (caseId) => {
  if (!isBlockchainConfigured()) return null;

  const contract = getContract();
  const tx = await contract.adminResolve(caseId);
  console.log(`⛓️  TX sent: ${tx.hash} (adminResolve)`);
  const receipt = await tx.wait();
  console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);

  return {
    transactionId: receipt.hash,
    blockNumber: Number(receipt.blockNumber)
  };
};

// ── 3. User confirms resolution on-chain ────────────────────
const userConfirmOnChain = async (caseId) => {
  if (!isBlockchainConfigured()) return null;

  const contract = getContract();
  const tx = await contract.userConfirm(caseId);
  console.log(`⛓️  TX sent: ${tx.hash} (userConfirm)`);
  const receipt = await tx.wait();
  console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);

  return {
    transactionId: receipt.hash,
    blockNumber: Number(receipt.blockNumber)
  };
};

// ── Read helpers ────────────────────────────────────────────
const getCaseFromChain = async (caseId) => {
  if (!isBlockchainConfigured()) return null;
  const contract = getContract();
  const c = await contract.getCase(caseId);
  return {
    dataHash: c.dataHash,
    reportedAt: Number(c.reportedAt),
    resolvedAt: Number(c.resolvedAt),
    confirmedAt: Number(c.confirmedAt),
    status: Number(c.status)   // 0=Reported, 1=AdminResolved, 2=Confirmed
  };
};

module.exports = {
  isBlockchainConfigured,
  generateHash,
  reportCaseOnChain,
  adminResolveOnChain,
  userConfirmOnChain,
  getCaseFromChain
};
