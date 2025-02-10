const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumMining", (m) => {
    // Deploy token contract first
    const token = m.contract("BohriumToken");
    
    // Deploy mining contract with token
    const mining = m.contract("BohriumMining", [token]);
    
    // Transfer ownership of token to mining contract
    const transferOwnership = m.call(token, "transferOwnership", [mining]);

    return { token, mining };
});