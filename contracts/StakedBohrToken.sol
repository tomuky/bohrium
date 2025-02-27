// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakedBohrToken is ERC20, Ownable {
    IERC20 public immutable bohrToken;
    
    uint256 public constant UNSTAKING_COOLDOWN_BLOCKS = 1000;
    
    // Mapping to track unstaking requests
    mapping(address => UnstakeRequest) public unstakeRequests;
    
    struct UnstakeRequest {
        uint256 amount;
        uint256 requestBlock;
    }
    
    event UnstakeRequested(address indexed user, uint256 amount, uint256 requestBlock);
    event UnstakeCompleted(address indexed user, uint256 amount);
    
    constructor(address _bohrToken) ERC20("Staked BOHR", "sBOHR") Ownable(msg.sender) {
        bohrToken = IERC20(_bohrToken);
    }

    // Disable transfers
    function transfer(address, uint256) public pure override returns (bool) {
        revert("sBOHR: non-transferrable");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("sBOHR: non-transferrable");
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        bohrToken.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }
    
    // Request to unstake (starts the cooldown)
    function requestUnstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient staked balance");
        require(unstakeRequests[msg.sender].amount == 0, "Unstake already requested");
        
        // Lock the tokens by burning them
        _burn(msg.sender, amount);
        
        // Record the unstake request
        unstakeRequests[msg.sender] = UnstakeRequest({
            amount: amount,
            requestBlock: block.number
        });
        
        emit UnstakeRequested(msg.sender, amount, block.number);
    }
    
    // Complete unstaking after cooldown
    function completeUnstake() external {
        UnstakeRequest memory request = unstakeRequests[msg.sender];
        require(request.amount > 0, "No unstake requested");
        require(block.number >= request.requestBlock + UNSTAKING_COOLDOWN_BLOCKS, "Cooldown not complete");
        
        // Transfer tokens back to user
        uint256 amount = request.amount;
        delete unstakeRequests[msg.sender];
        
        bohrToken.transfer(msg.sender, amount);
        emit UnstakeCompleted(msg.sender, amount);
    }
    
    // Cancel unstaking request (get sBOHR back)
    function cancelUnstake() external {
        UnstakeRequest memory request = unstakeRequests[msg.sender];
        require(request.amount > 0, "No unstake requested");
        
        // Return sBOHR tokens
        uint256 amount = request.amount;
        delete unstakeRequests[msg.sender];
        
        _mint(msg.sender, amount);
    }
} 