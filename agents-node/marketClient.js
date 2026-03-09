import { ethers } from "ethers";
import { loadABI, WAD } from "./config.js";

// Read-only client that doesn't need a private key
export class ReadOnlyMarketClient {
  constructor(rpcUrl, contractAddress) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const abi = loadABI();
    this.readContract = new ethers.Contract(contractAddress, abi, this.provider);
  }

  async getMarketInfo(marketId) {
    const result = await this.readContract.getMarketInfo(marketId);
    return {
      question: result[0],
      currentPrice: result[1],
      creator: result[2],
      resolved: result[3],
      totalPool: result[4],
      predictionCount: Number(result[5]),
    };
  }

  async getMarketParams(marketId) {
    const result = await this.readContract.getMarketParams(marketId);
    return {
      alpha: result[0],
      k: Number(result[1]),
      flatReward: result[2],
      bondAmount: result[3],
      liquidityParam: result[4],
      createdAt: Number(result[5]),
    };
  }

  async getProtocolConfig() {
    const result = await this.readContract.getProtocolConfig();
    return {
      owner: result[0],
      treasury: result[1],
      protocolFeeBps: Number(result[2]),
    };
  }

  async getPrediction(marketId, index) {
    const result = await this.readContract.getPrediction(marketId, index);
    return {
      predictor: result[0],
      probability: result[1],
      priceBefore: result[2],
      priceAfter: result[3],
      bond: result[4],
      timestamp: Number(result[5]),
    };
  }

  async getPredictions(marketId) {
    const count = await this.getPredictionCount(marketId);
    const predictions = [];
    for (let i = 0; i < count; i++) {
      predictions.push(await this.getPrediction(marketId, i));
    }
    return predictions;
  }

  async getPredictionCount(marketId) {
    const count = await this.readContract.getPredictionCount(marketId);
    return Number(count);
  }

  async getMarketCount() {
    const count = await this.readContract.getMarketCount();
    return Number(count);
  }

  async isMarketActive(marketId) {
    return await this.readContract.isMarketActive(marketId);
  }

  async hasPredicted(marketId, address) {
    return await this.readContract.hasPredicted(marketId, address);
  }

  async getPayout(marketId, address) {
    return await this.readContract.getPayoutAmount(marketId, address);
  }
}

export class MarketClient {
  constructor(rpcUrl, contractAddress, privateKey) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.address = this.wallet.address;

    const abi = loadABI();
    this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
    this.readContract = new ethers.Contract(contractAddress, abi, this.provider);
  }

  // ---- Read functions ----

  async getMarketInfo(marketId) {
    const result = await this.readContract.getMarketInfo(marketId);
    return {
      question: result[0],
      currentPrice: result[1],
      creator: result[2],
      resolved: result[3],
      totalPool: result[4],
      predictionCount: Number(result[5]),
    };
  }

  async getMarketParams(marketId) {
    const result = await this.readContract.getMarketParams(marketId);
    return {
      alpha: result[0],
      k: Number(result[1]),
      flatReward: result[2],
      bondAmount: result[3],
      liquidityParam: result[4],
      createdAt: Number(result[5]),
    };
  }

  async getProtocolConfig() {
    const result = await this.readContract.getProtocolConfig();
    return {
      owner: result[0],
      treasury: result[1],
      protocolFeeBps: Number(result[2]),
    };
  }

  async getMarket(marketId) {
    const [info, params] = await Promise.all([
      this.getMarketInfo(marketId),
      this.getMarketParams(marketId),
    ]);
    return { ...info, ...params };
  }

  async getPrediction(marketId, index) {
    const result = await this.readContract.getPrediction(marketId, index);
    return {
      predictor: result[0],
      probability: result[1],
      priceBefore: result[2],
      priceAfter: result[3],
      bond: result[4],
      timestamp: Number(result[5]),
    };
  }

  async getPredictions(marketId) {
    const count = await this.getPredictionCount(marketId);
    const predictions = [];
    for (let i = 0; i < count; i++) {
      predictions.push(await this.getPrediction(marketId, i));
    }
    return predictions;
  }

  async getCurrentPrice(marketId) {
    const info = await this.getMarketInfo(marketId);
    return Number(info.currentPrice) / Number(WAD);
  }

  async getPayout(marketId, address) {
    return await this.readContract.getPayoutAmount(marketId, address);
  }

  async isMarketActive(marketId) {
    return await this.readContract.isMarketActive(marketId);
  }

  async hasPredicted(marketId, address) {
    return await this.readContract.hasPredicted(marketId, address);
  }

  async hasClaimed(marketId, address) {
    return await this.readContract.hasClaimed(marketId, address);
  }

  async getPredictionCount(marketId) {
    const count = await this.readContract.getPredictionCount(marketId);
    return Number(count);
  }

  async getMarketCount() {
    const count = await this.readContract.getMarketCount();
    return Number(count);
  }

  async getBalance(address) {
    return await this.provider.getBalance(address || this.address);
  }

  async getGasPrice() {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice;
  }

  // ---- Write functions ----

  async predict(marketId, probability, bondAmount) {
    const tx = await this.contract.predict(marketId, probability, {
      value: bondAmount,
      gasLimit: 3_000_000n,
    });
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${tx.hash}`);
    }
    return receipt;
  }

  async claimPayout(marketId) {
    const tx = await this.contract.claimPayout(marketId, {
      gasLimit: 300_000n,
    });
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${tx.hash}`);
    }
    return receipt;
  }

  async forceResolve(marketId) {
    const tx = await this.contract.forceResolve(marketId, {
      gasLimit: 3_000_000n,
    });
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${tx.hash}`);
    }
    return receipt;
  }

  async sweepResidual(marketId) {
    const tx = await this.contract.sweepResidual(marketId, {
      gasLimit: 300_000n,
    });
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${tx.hash}`);
    }
    return receipt;
  }

  async createMarket(question, alpha, k, flatReward, bondAmount, liquidityParam, initialPrice, funding = null) {
    if (funding === null) {
      funding = flatReward * BigInt(k) + liquidityParam;
    }
    const marketId = await this.getMarketCount();
    const tx = await this.contract.createMarket(
      question, alpha, k, flatReward, bondAmount, liquidityParam, initialPrice,
      { value: funding, gasLimit: 500_000n }
    );
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${tx.hash}`);
    }
    const info = await this.getMarketInfo(marketId);
    console.log(`[Verify] Market #${marketId}: price=${Number(info.currentPrice) / 1e18}, q=${info.question.slice(0, 50)}`);
    return marketId;
  }
}
