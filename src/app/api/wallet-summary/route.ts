import { NextResponse } from "next/server";

const ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

const TOKENS = [
  {
    symbol: "WETH",
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    decimals: 18,
  },
  {
    symbol: "USDC",
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
  },
  {
    symbol: "USDT",
    address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9",
    decimals: 6,
  },
  {
    symbol: "ARB",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    decimals: 18,
  },
] as const;

type TokenSummary = {
  symbol: string;
  balance: string;
  raw: string;
};

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function padAddress(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function formatUnits(hexValue: string, decimals: number) {
  const raw = BigInt(hexValue);
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, 4);
  const trimmedFraction = fractionText.replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(ARBITRUM_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("RPC request failed");
  }

  const data = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };

  if (data.error || !data.result) {
    throw new Error(data.error?.message ?? "RPC error");
  }

  return data.result;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { address?: string };
  const address = body.address?.trim() ?? "";

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  try {
    const ethBalanceHex = await rpcCall("eth_getBalance", [address, "latest"]);

    const tokenSummaries = await Promise.all(
      TOKENS.map(async (token): Promise<TokenSummary> => {
        const data = `0x70a08231${padAddress(address)}`;
        const raw = await rpcCall("eth_call", [{ to: token.address, data }, "latest"]);

        return {
          symbol: token.symbol,
          balance: formatUnits(raw, token.decimals),
          raw,
        };
      }),
    );

    return NextResponse.json({
      address,
      native: {
        symbol: "ETH",
        balance: formatUnits(ethBalanceHex, 18),
        raw: ethBalanceHex,
      },
      tokens: tokenSummaries,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not fetch wallet balances from Arbitrum right now." },
      { status: 500 },
    );
  }
}
