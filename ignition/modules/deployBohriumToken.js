const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumToken", (m) => {
    const token = m.contract("BohriumToken");
    
    return token;
});
