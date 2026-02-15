const hre = require("hardhat");

async function main() {
  const identity = await hre.ethers.getContractAt(
    "AuthorIdentity",
    "0xB9ffa688A8Bb332221030BbBE46bE5bF03323170"
  );

  const count = await identity.getBibliographyCount();
  const linked = await identity.getLinkedContractCount();
  const id = await identity.getIdentity();

  console.log("Works:    ", count.toString());
  console.log("Linked:   ", linked.toString());
  console.log("Name:     ", id.realName);
  console.log("Nickname: ", id.nickname);
  console.log("Pseudonym:", id.pseudonym);
  console.log("Org:      ", id.organization);
  console.log("Domain:   ", id.domain);
  console.log("Amazon:   ", id.amazonAuthorUrl);
}

main().catch(console.error);
