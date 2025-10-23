const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumMining", (m) => {
    // Deploy token contract first
    const token = m.contract("BohriumToken");
    
    // Deploy staked token contract
    const stakedToken = m.contract("StakedBohrToken", [token]);
    
    // Deploy mining contract with both tokens
    const mining = m.contract("BohriumMining", [token, stakedToken]);
    
    // Set initial minter to mining contract
    const setInitialMinter = m.call(token, "setInitialMinter", [mining]);
    
    // Set the mining contract address in the staked token contract
    const setMiningContract = m.call(stakedToken, "setMiningContract", [mining]);

    return { token, stakedToken, mining };
});