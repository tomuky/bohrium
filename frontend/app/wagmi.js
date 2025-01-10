import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Bohrium Mining',
  projectId: 'b95c18e2f7c838c9e3ef9ae47e7bf081',
  chains: [baseSepolia],
  ssr: true
})

export const MINING_CONTRACT_ADDRESS = "0x50C40138D1043C55aF22d6e7E18ECbF2be6b0177"
export const MINING_ABI = [
  {
    name: "roundId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "roundStartTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "submitNonce",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "nonce" }],
    outputs: []
  },
  {
    name: "endRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "bohriumToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  }
];

export const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)"
]