// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBohriumMining {
    function blockHeight() external view returns (uint256);
}

contract StakedBohrToken is ERC20, Ownable {
    IERC20 public immutable bohrToken;
    
    uint256 public constant UNSTAKING_COOLDOWN_BLOCKS = 1000;
    
    // Reference to the mining contract to access Bohrium block height
    address public miningContract;
    
    // Mapping to track unstaking requests
    mapping(address => UnstakeRequest) public unstakeRequests;
    
    // Delegation mappings
    mapping(address => address) public delegatedBy; // session wallet => main wallet
    mapping(address => address) public delegatedTo; // main wallet => session wallet
    
    struct UnstakeRequest {
        uint256 amount;
        uint256 requestBohriumBlock; // Changed from requestBlock to requestBohriumBlock
    }
    
    event UnstakeRequested(address indexed user, uint256 amount, uint256 requestBohriumBlock);
    event UnstakeCompleted(address indexed user, uint256 amount);
    event DelegationSet(address indexed sessionWallet, address indexed mainWallet);
    event DelegationRemoved(address indexed sessionWallet, address indexed mainWallet);
    
    constructor(address _bohrToken) ERC20("Staked BOHR", "sBOHR") Ownable(msg.sender) {
        bohrToken = IERC20(_bohrToken);
    }
    
    // Set the mining contract address (only owner can do this)
    function setMiningContract(address _miningContract) external onlyOwner {
        require(_miningContract != address(0), "Invalid mining contract address");
        miningContract = _miningContract;
    }
    
    // Get current Bohrium block height
    function getCurrentBohriumBlock() public view returns (uint256) {
        require(miningContract != address(0), "Mining contract not set");
        return IBohriumMining(miningContract).blockHeight();
    }
    
    // Override transfer functions to make sBOHR non-transferrable
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            revert("sBOHR: non-transferrable");
        }
        super._update(from, to, value);
    }
    
    // Stake BOHR for sBOHR
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        
        // Transfer BOHR from user to this contract
        bohrToken.transferFrom(msg.sender, address(this), amount);
        
        // Mint sBOHR to user
        _mint(msg.sender, amount);
    }
    
    // Request to unstake sBOHR back to BOHR
    function requestUnstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient staked balance");
        require(unstakeRequests[msg.sender].amount == 0, "Unstake already requested");
        require(miningContract != address(0), "Mining contract not set");
        
        // Lock the tokens by burning them
        _burn(msg.sender, amount);
        
        // Get current Bohrium block height
        uint256 currentBohriumBlock = getCurrentBohriumBlock();
        
        // Record the unstake request
        unstakeRequests[msg.sender] = UnstakeRequest({
            amount: amount,
            requestBohriumBlock: currentBohriumBlock
        });
        
        emit UnstakeRequested(msg.sender, amount, currentBohriumBlock);
    }
    
    // Complete unstake after cooldown
    function completeUnstake() external {
        UnstakeRequest memory request = unstakeRequests[msg.sender];
        require(request.amount > 0, "No unstake requested");
        
        // Check if enough Bohrium blocks have passed
        uint256 currentBohriumBlock = getCurrentBohriumBlock();
        require(currentBohriumBlock >= request.requestBohriumBlock + UNSTAKING_COOLDOWN_BLOCKS, 
                "Cooldown not complete");
        
        // Clear the request
        uint256 amount = request.amount;
        delete unstakeRequests[msg.sender];
        
        // Return BOHR tokens
        bohrToken.transfer(msg.sender, amount);
        
        emit UnstakeCompleted(msg.sender, amount);
    }
    
    // Cancel unstake request
    function cancelUnstake() external {
        UnstakeRequest memory request = unstakeRequests[msg.sender];
        require(request.amount > 0, "No unstake requested");
        
        // Return sBOHR tokens
        uint256 amount = request.amount;
        delete unstakeRequests[msg.sender];
        
        _mint(msg.sender, amount);
    }
    
    // Set delegation from main wallet to session wallet
    function setDelegation(address sessionWallet) external {
        require(sessionWallet != address(0), "Invalid session wallet");
        require(sessionWallet != msg.sender, "Cannot delegate to self");
        require(delegatedTo[msg.sender] == address(0), "Already delegated");
        require(delegatedBy[sessionWallet] == address(0), "Session already delegated");
        
        // Add this check to prevent circular delegations
        require(delegatedTo[sessionWallet] == address(0), "Circular delegation not allowed");
        
        delegatedBy[sessionWallet] = msg.sender;
        delegatedTo[msg.sender] = sessionWallet;
        
        emit DelegationSet(sessionWallet, msg.sender);
    }
    
    // Remove delegation
    function removeDelegation() external {
        address sessionWallet = delegatedTo[msg.sender];
        require(sessionWallet != address(0), "No delegation exists");
        
        address mainWallet = msg.sender;
        delegatedBy[sessionWallet] = address(0);
        delegatedTo[mainWallet] = address(0);
        
        emit DelegationRemoved(sessionWallet, mainWallet);
    }
    
    // Get effective balance including delegations
    function getEffectiveBalance(address account) public view returns (uint256) {
        uint256 directBalance = balanceOf(account);
        
        // If this is a session wallet, add the main wallet's balance
        address mainWallet = delegatedBy[account];
        if (mainWallet != address(0)) {
            return directBalance + balanceOf(mainWallet);
        }
        
        return directBalance;
    }
} 