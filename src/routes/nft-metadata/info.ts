import { createApiInfoRouter } from '../../middleware/apiInfo';
export const nftMetadataInfoRouter = createApiInfoRouter({
  name: 'NFT Metadata API', slug: 'nft-metadata', version: '1.0.0',
  description: 'Fetch NFT metadata, traits, collection stats, wallet holdings and transfer history via OpenSea.',
  category: 'NFT & Web3',
  endpoints: [
    { method: 'GET', path: '/token/:contractAddress/:tokenId', description: 'Get single NFT metadata and traits' },
    { method: 'GET', path: '/collection/:contractAddress', description: 'Get collection info and floor price' },
    { method: 'GET', path: '/wallet/:walletAddress', description: 'Get all NFTs owned by a wallet' },
    { method: 'GET', path: '/transfers/:contractAddress/:tokenId', description: 'Get transfer history for an NFT' },
  ],
});
