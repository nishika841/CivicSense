// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CivicSense
 * @notice 3-step complaint lifecycle on Sepolia:
 *         1. User reports a case   → reportCase()
 *         2. Admin marks resolved  → adminResolve()
 *         3. Reporter confirms     → userConfirm()  (case fully closed)
 */
contract CivicSense is Ownable {

    enum Status {
        Reported,           // 0 – user filed the complaint
        AdminResolved,      // 1 – admin says it is fixed
        Confirmed           // 2 – reporter agrees it is fixed
    }

    struct Case {
        bytes32 dataHash;       // SHA-256 hash of off-chain complaint data
        uint256 reportedAt;
        uint256 resolvedAt;
        uint256 confirmedAt;
        Status  status;
        bool    exists;
    }

    mapping(string => Case) public cases;
    string[] public caseIds;

    // ── Events ──────────────────────────────────────────────
    event CaseReported(string indexed caseId, bytes32 dataHash, uint256 timestamp);
    event CaseResolved(string indexed caseId, uint256 timestamp);
    event CaseConfirmed(string indexed caseId, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    // ── 1. User reports a case ──────────────────────────────
    function reportCase(string calldata _caseId, bytes32 _dataHash) external {
        require(!cases[_caseId].exists, "Case already exists");
        require(_dataHash != bytes32(0), "Hash cannot be empty");

        cases[_caseId] = Case({
            dataHash: _dataHash,
            reportedAt: block.timestamp,
            resolvedAt: 0,
            confirmedAt: 0,
            status: Status.Reported,
            exists: true
        });

        caseIds.push(_caseId);
        emit CaseReported(_caseId, _dataHash, block.timestamp);
    }

    // ── 2. Admin marks case as resolved ─────────────────────
    function adminResolve(string calldata _caseId) external onlyOwner {
        Case storage c = cases[_caseId];
        require(c.exists, "Case does not exist");
        require(c.status == Status.Reported, "Case is not in Reported state");

        c.status = Status.AdminResolved;
        c.resolvedAt = block.timestamp;
        emit CaseResolved(_caseId, block.timestamp);
    }

    // ── 3. Reporter confirms the resolution ─────────────────
    function userConfirm(string calldata _caseId) external {
        Case storage c = cases[_caseId];
        require(c.exists, "Case does not exist");
        require(c.status == Status.AdminResolved, "Case is not in AdminResolved state");

        c.status = Status.Confirmed;
        c.confirmedAt = block.timestamp;
        emit CaseConfirmed(_caseId, block.timestamp);
    }

    // ── View helpers ────────────────────────────────────────
    function getCase(string calldata _caseId)
        external view
        returns (bytes32 dataHash, uint256 reportedAt, uint256 resolvedAt, uint256 confirmedAt, Status status)
    {
        Case memory c = cases[_caseId];
        require(c.exists, "Case does not exist");
        return (c.dataHash, c.reportedAt, c.resolvedAt, c.confirmedAt, c.status);
    }

    function caseExists(string calldata _caseId) external view returns (bool) {
        return cases[_caseId].exists;
    }

    function getTotalCases() external view returns (uint256) {
        return caseIds.length;
    }
}
