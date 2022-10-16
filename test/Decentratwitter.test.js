const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Decentratwitter", function() {
    let Decentratwitter
    let deployer, user1, user2, users
    let URI = "SampleURI"
    let postHash = "SampleHash"
    beforeEach(async() => {
        [deployer, user1, user2, ...users] = await ethers.getSigners();
        const DecentratwitterFactory = await ethers.getContractFactory("Decentratwitter");
        decentratwitter = await DecentratwitterFactory.deploy();
        await decentratwitter.connect(user1).mint(URI)
    })
    describe('Deployment', async() => {
        it("Should track name and symbol", async function() {
            const nftName = "Decentratwitter"
            const nftSymbol = "DAPP"
            expect(await decentratwitter.name()).to.equal(nftName);
            expect(await decentratwitter.symbol()).to.equal(nftSymbol);
        });
    })
    describe('Minting NFTs', async() => {
        it("Should track each minted NFT", async function() {
            expect(await decentratwitter.tokenCount()).to.equal(1);
            expect(await decentratwitter.balanceOf(user1.address)).to.equal(1);
            expect(await decentratwitter.tokenURI(1)).to.equal(URI);

            await decentratwitter.connect(user2).mint(URI)
            expect(await decentratwitter.tokenCount()).to.equal(2);
            expect(await decentratwitter.balanceOf(user2.address)).to.equal(1);
            expect(await decentratwitter.tokenURI(2)).to.equal(URI);
        });
    })
    describe('Setting profiles', async() => {
        it("Should allow users to select which NFT they own to represent their profile", async function() {
            await decentratwitter.connect(user1).mint(URI)
            expect(await decentratwitter.profiles(user1.address)).to.equal(2);
            await decentratwitter.connect(user1).setProfile(1)
            expect(await decentratwitter.profiles(user1.address)).to.equal(1);
            //FAIL CASE//
            await expect(
                decentratwitter.connect(user2).setProfile(2)
            ).to.revertedWith("Must own the nft you want to select as your profile");
        });
    })
    describe('Uploading posts', async() => {
        it("Should track posts uploaded only by users who own an NFT", async function() {
            // user1 uploads a post
            await expect(decentratwitter.connect(user1).uploadPost(postHash))
                .to.emit(decentratwitter, "PostCreated")
                .withArgs(
                    1,
                    postHash,
                    0,
                    user1.address
                )
            const postCount = await decentratwitter.postCount()
            expect(postCount).to.equal(1);
            // Check from struct
            const post = await decentratwitter.posts(postCount)
            expect(post.id).to.equal(1)
            expect(post.hash).to.equal(postHash)
            expect(post.tipAmount).to.equal(0)
            expect(post.author).to.equal(user1.address)
                // FAIL CASE #1 //
                // user 2 tried to upload a post without owning an nft
            await expect(
                decentratwitter.connect(user2).uploadPost(postHash)
            ).to.be.revertedWith("Must own a decentratwitter nft to post");
            // FAIL CASE #2 //
            // user 1 tried to upload a post with an empty post hash.
            await expect(
                decentratwitter.connect(user1).uploadPost("")
            ).to.be.revertedWith("Cannot pass an empty hash");
        });
    })
    describe('Tipping posts', async() => {
        it("Should allow users to tip posts and track each posts tip amount", async function() {
            // user1 uploads a post
            await decentratwitter.connect(user1).uploadPost(postHash)
                // Track user1 balance before their post gets tipped
            const initAuthorBalance = await ethers.provider.getBalance(user1.address)
                // Set tip amount to 1 ether
            const tipAmount = ethers.utils.parseEther("1")
                // user2 tips user1's post
            await expect(decentratwitter.connect(user2).tipPostOwner(1, { value: tipAmount }))
                .to.emit(decentratwitter, "PostTipped")
                .withArgs(
                    1,
                    postHash,
                    tipAmount,
                    user1.address
                )
                // Check that tipAmount has been updated from struct
            const post = await decentratwitter.posts(1)
            expect(post.tipAmount).to.equal(tipAmount)
                // Check that user1 received funds
            const finalAuthorBalance = await ethers.provider.getBalance(user1.address)
            expect(finalAuthorBalance).to.equal(initAuthorBalance.add(tipAmount))
                // FAIL CASE #1 //
                // user 2 tries to tip a post that does not exist
            await expect(
                decentratwitter.connect(user2).tipPostOwner(2)
            ).to.be.revertedWith("Invalid post id");
            // FAIL CASE #2 //
            // user 1 tries to tip their own post
            await expect(
                decentratwitter.connect(user1).tipPostOwner(1)
            ).to.be.revertedWith("Cannot tip your own post");
        });
    })

});