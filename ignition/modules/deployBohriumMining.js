const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumMining", (m) => {
    const mining = m.contract("BohriumMining", ["0xC5DF11E456D30f4FE1c319e84eb238cA8e0f4e54"]);
    
    return mining;
});

