const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("UpdateMiningContract", (m) => {
    // This script assumes existing token and staked token contracts
    // You would need to provide their addresses when running this
    
    // Deploy new mining contract with existing token addresses
    const newMining = m.contract("BohriumMining", [
        m.getParameter("existingTokenAddress"),
        m.getParameter("existingStakedTokenAddress")
    ]);
    
    // Propose minter update (requires admin role)
    const proposeMinterUpdate = m.call(m.getParameter("existingTokenAddress"), "proposeMinterUpdate", [newMining]);
    
    // Update staked token reference to new mining contract
    const setMiningContract = m.call(m.getParameter("existingStakedTokenAddress"), "setMiningContract", [newMining]);

    return { newMining };
});
