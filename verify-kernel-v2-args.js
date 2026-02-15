/**
 * verify-kernel-v2-args.js — Constructor arguments for Polygonscan verification
 *
 * PublishingKernelV2 constructor:
 *   (title, ipfsCID, sha256Hash, roots, genesisAnchor, predecessorKernel, authorSignature)
 */
module.exports = [
  // title
  "The 2,500 Donkeys",
  // ipfsCID
  "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK",
  // sha256Hash
  "d1b9a57f618f0445dc7a5d30d5bf4e707bb4d0cd8d83ceb277f9628d5f68363c",
  // MerkleRoots tuple
  [
    "0xdd95d1216b8e2cb8008c8993dffc54d66b550018a47401dd5df001ff487467d3", // manuscriptRoot
    "0x9c653a2e453e895f294375818bb872d47d4c90b15859587ba2c5238024202c56", // artifactRoot
    "0x0e45331c0b80738ff3f491e63b47a5454f162cfe5a1d367e90b709c96c56c638", // imageRoot
    "0x32bed9e54ed6dc5f4ee8082dce928bd86fb76c36b92d9f949ba12c046674f32c", // promptRoot
    "0x6719ed7f9e142a39a4a7db533895562bdf5379cf7f9816ed7cbe045ca359594e"  // editionRoot
  ],
  // genesisAnchor (original LiteraryAnchor)
  "0x97f456300817eaE3B40E235857b856dfFE8bba90",
  // predecessorKernel (PublishingKernel v1)
  "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae",
  // authorSignature (EIP-191 over editionRoot)
  "0x854d2fe7016fb1129f2e0229d4b68c083af5d644704f09325c105b52c755ddfc41d583ab873a0e1dd280e1c9f9cd7f5a97173c446eb33bab261b90a95cccb47c1b"
];
