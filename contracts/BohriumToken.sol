// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BohriumToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 public constant UPDATE_DELAY = 2 days;
    address public pendingMinter;
    uint256 public updateTime;
    address public currentMinter;
    
    event MinterUpdateProposed(address indexed newMinter, uint256 executeTime);
    event MinterUpdateExecuted(address indexed newMinter);
    event MinterUpdateCancelled(address indexed cancelledMinter);
    
    constructor() ERC20("Bohrium", "BOHR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    // Function to set initial minter (only callable by admin, only if no current minter)
    function setInitialMinter(address _minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(currentMinter == address(0), "Minter already set");
        require(_minter != address(0), "Invalid minter address");
        
        _grantRole(MINTER_ROLE, _minter);
        currentMinter = _minter;
    }
    
    function proposeMinterUpdate(address _newMinter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newMinter != address(0), "Invalid address");
        require(pendingMinter == address(0), "Update already pending");
        
        pendingMinter = _newMinter;
        updateTime = block.timestamp + UPDATE_DELAY;
        
        emit MinterUpdateProposed(_newMinter, updateTime);
    }
    
    function executeMinterUpdate() external {
        require(block.timestamp >= updateTime, "Update not ready");
        require(pendingMinter != address(0), "No pending update");
        
        // Revoke old minter if there is one
        if (currentMinter != address(0)) {
            _revokeRole(MINTER_ROLE, currentMinter);
        }
        
        // Grant new minter
        address newMinter = pendingMinter;
        _grantRole(MINTER_ROLE, newMinter);
        currentMinter = newMinter;
        pendingMinter = address(0);
        
        emit MinterUpdateExecuted(newMinter);
    }
    
    function cancelMinterUpdate() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(pendingMinter != address(0), "No pending update");
        
        address cancelledMinter = pendingMinter;
        pendingMinter = address(0);
        updateTime = 0;
        
        emit MinterUpdateCancelled(cancelledMinter);
    }
    
    // View function to check pending update status
    function getPendingUpdate() external view returns (address pending, uint256 executeTime, bool canExecute) {
        return (pendingMinter, updateTime, block.timestamp >= updateTime && pendingMinter != address(0));
    }
}
