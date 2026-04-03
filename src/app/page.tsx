"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

type RiskLevel = "low" | "balanced" | "high";

type Recommendation = {
  title: string;
  detail: string;
  urgency: "low" | "medium" | "high";
  action: string;
};

type AnalysisResponse = {
  summary: string;
  healthScore: number;
  warnings: string[];
  opportunities: string[];
  recommendations: Recommendation[];
  nextStep: string;
};

type BalanceItem = {
  symbol: string;
  balance: string;
  raw: string;
};

type WalletSummaryResponse = {
  address: string;
  native: BalanceItem;
  tokens: BalanceItem[];
};

type WalletOption = "metamask" | "okx" | "subwallet" | "walletconnect";

type EthereumProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isSubWallet?: boolean;
  isSubwallet?: boolean;
  name?: string;
  providerName?: string;
  selectedProvider?: string;
  info?: {
    name?: string;
    rdns?: string;
  };
  providerInfo?: {
    name?: string;
    rdns?: string;
  };
  providers?: EthereumProvider[];
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  [key: string]: unknown;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    injectedWeb3?: Record<string, unknown>;
    okxwallet?: unknown;
    subwallet?: unknown;
  }
}

const goals = [
  "Reduce wallet risk",
  "Find safer yield ideas",
  "Rebalance into ETH and stables",
  "Prepare for my next Arbitrum move",
];

const urgencyClasses: Record<Recommendation["urgency"], string> = {
  low: "border-emerald-700/15 bg-emerald-50 text-emerald-900",
  medium: "border-amber-700/15 bg-amber-50 text-amber-900",
  high: "border-rose-700/15 bg-rose-50 text-rose-900",
};

const walletOptions: Array<{
  id: WalletOption;
  name: string;
  description: string;
  accent: string;
  installUrl?: string;
}> = [
  {
    id: "metamask",
    name: "MetaMask",
    description: "Best for most users with browser extension support.",
    accent: "#f6851b",
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    description: "Good multichain wallet with quick extension connection.",
    accent: "#111111",
    installUrl: "https://www.okx.com/web3",
  },
  {
    id: "subwallet",
    name: "SubWallet",
    description: "Polkadot-ready wallet with a clean multichain experience.",
    accent: "#2ed3a7",
    installUrl: "https://www.subwallet.app/download.html",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    description: "Mobile-friendly handoff. Good fallback for demo devices.",
    accent: "#3b99fc",
  },
];

function walletIcon(option: WalletOption) {
  const logoMap: Record<WalletOption, { src: string; bg: string; fit?: string }> = {
    metamask: {
      src: "/wallet-metamask.png",
      bg: "#fff7f0",
      fit: "object-contain",
    },
    okx: {
      src: "/wallet-okx.webp",
      bg: "#d8ff3f",
      fit: "object-cover",
    },
    subwallet: {
      src: "/wallet-subwallet.png",
      bg: "#10231d",
      fit: "object-cover",
    },
    walletconnect: {
      src: "/wallet-walletconnect.png",
      bg: "#3b5cff",
      fit: "object-cover",
    },
  };

  const logo = logoMap[option];

  return (
    <div
      className="grid h-12 w-12 place-items-center overflow-hidden border border-[#e6ddd2]"
      style={{ background: logo.bg }}
    >
      <Image
        src={logo.src}
        alt=""
        width={48}
        height={48}
        className={`h-full w-full ${logo.fit ?? "object-contain"}`}
      />
    </div>
  );
}

function asEthereumProvider(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const maybeProvider = value as Partial<EthereumProvider>;

  if (typeof maybeProvider.request !== "function") return null;

  return value as EthereumProvider;
}

function getProviderMetadataText(provider: EthereumProvider) {
  return [
    provider.name,
    provider.providerName,
    provider.selectedProvider,
    typeof provider.constructor?.name === "string" ? provider.constructor.name : undefined,
    provider.info?.name,
    provider.info?.rdns,
    provider.providerInfo?.name,
    provider.providerInfo?.rdns,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function providerHasTruthyKeyMatch(provider: EthereumProvider, token: string) {
  const target = token.toLowerCase();

  return Object.entries(provider).some(([key, value]) => {
    if (!key.toLowerCase().includes(target)) return false;
    if (value === true) return true;
    if (typeof value === "string") {
      return value.toLowerCase().includes(target);
    }

    return false;
  });
}

function getAllInjectedProviders(ethereum: EthereumProvider | undefined) {
  const providers: EthereumProvider[] = [];
  const seen = new Set<EthereumProvider>();

  const addProvider = (candidate: unknown) => {
    const provider = asEthereumProvider(candidate);

    if (!provider || seen.has(provider)) return;

    seen.add(provider);
    providers.push(provider);
  };

  addProvider(ethereum);

  if (ethereum?.providers?.length) {
    ethereum.providers.forEach(addProvider);
  }

  if (typeof window !== "undefined") {
    const win = window as typeof window & Record<string, unknown>;
    const okxRoot = asEthereumProvider(win.okxwallet);
    const subwalletRoot = asEthereumProvider(win.subwallet);
    const okxNested =
      win.okxwallet && typeof win.okxwallet === "object"
        ? asEthereumProvider((win.okxwallet as { ethereum?: unknown }).ethereum)
        : null;
    const subwalletNested =
      win.subwallet && typeof win.subwallet === "object"
        ? asEthereumProvider((win.subwallet as { ethereum?: unknown }).ethereum)
        : null;

    addProvider(okxRoot);
    addProvider(subwalletRoot);
    addProvider(okxNested);
    addProvider(subwalletNested);
    addProvider(win["SubWallet"]);
    addProvider(win["subWallet"]);
    addProvider(win["subwalletEvm"]);
    addProvider(win["okxEthereum"]);
    addProvider(win["okexWallet"]);
  }

  return providers;
}

function scoreProviderForWallet(provider: EthereumProvider, wallet: WalletOption) {
  const metadata = getProviderMetadataText(provider);
  const hasMeta = (token: string) => metadata.includes(token.toLowerCase());

  const isMetaMask =
    provider.isMetaMask === true ||
    providerHasTruthyKeyMatch(provider, "metamask") ||
    hasMeta("metamask");
  const isOkx =
    provider.isOkxWallet === true ||
    provider.isOKExWallet === true ||
    providerHasTruthyKeyMatch(provider, "okx") ||
    providerHasTruthyKeyMatch(provider, "okex") ||
    hasMeta("okx") ||
    hasMeta("okex");
  const isSubwallet =
    provider.isSubWallet === true ||
    provider.isSubwallet === true ||
    providerHasTruthyKeyMatch(provider, "subwallet") ||
    hasMeta("subwallet");

  if (wallet === "metamask") {
    if (!isMetaMask) return -1;

    let score = 12;

    if (provider.isRabby === true) score -= 10;
    if (isOkx || isSubwallet) score -= 8;

    return score;
  }

  if (wallet === "okx") {
    if (!isOkx) return -1;

    let score = 12;

    if (isMetaMask && !isOkx) score -= 10;
    if (isSubwallet) score -= 4;

    return score;
  }

  if (wallet === "subwallet") {
    if (!isSubwallet) return -1;

    let score = 12;

    if (isMetaMask && !isSubwallet) score -= 10;
    if (isOkx) score -= 4;

    return score;
  }

  return -1;
}

function getInjectedProvider(
  ethereum: EthereumProvider | undefined,
  wallet: WalletOption,
) {
  const providers = getAllInjectedProviders(ethereum);

  let bestProvider: EthereumProvider | null = null;
  let bestScore = -1;

  for (const provider of providers) {
    const score = scoreProviderForWallet(provider, wallet);

    if (score > bestScore) {
      bestProvider = provider;
      bestScore = score;
    }
  }

  if (!bestProvider || bestScore < 3) return null;

  return bestProvider;
}

function formatWalletAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function boxClassName(extra = "") {
  return `border border-black/8 bg-white/78 shadow-[0_20px_50px_rgba(43,33,20,0.06)] ${extra}`.trim();
}

function darkBoxClassName(extra = "") {
  return `border border-white/10 bg-[#171411] shadow-[0_28px_80px_rgba(23,20,17,0.18)] ${extra}`.trim();
}

function asText(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    const candidate = value as { title?: unknown; detail?: unknown; action?: unknown };

    if (typeof candidate.title === "string") return candidate.title;
    if (typeof candidate.detail === "string") return candidate.detail;
    if (typeof candidate.action === "string") return candidate.action;
  }

  return fallback;
}

function normalizeRecommendations(value: unknown): Recommendation[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 3).map((entry, index) => {
    const item = entry as Partial<Recommendation> | undefined;
    const urgency =
      item?.urgency === "low" || item?.urgency === "medium" || item?.urgency === "high"
        ? item.urgency
        : "medium";

    return {
      title: asText(item?.title, `Recommendation ${index + 1}`),
      detail: asText(item?.detail, "Review this recommendation before proceeding."),
      urgency,
      action: asText(item?.action, "Inspect the suggested action."),
    };
  });
}

function normalizeAnalysisResponse(value: unknown): AnalysisResponse {
  const analysis = (value ?? {}) as Partial<AnalysisResponse>;

  return {
    summary: asText(analysis.summary, "Your wallet analysis is ready."),
    healthScore:
      typeof analysis.healthScore === "number" && Number.isFinite(analysis.healthScore)
        ? analysis.healthScore
        : 72,
    warnings: Array.isArray(analysis.warnings)
      ? analysis.warnings.map((item, index) => asText(item, `Warning ${index + 1}`))
      : [],
    opportunities: Array.isArray(analysis.opportunities)
      ? analysis.opportunities.map((item, index) =>
          asText(item, `Opportunity ${index + 1}`),
        )
      : [],
    recommendations: normalizeRecommendations(analysis.recommendations),
    nextStep: asText(
      analysis.nextStep,
      "Review the report and choose the safest next action.",
    ),
  };
}

const ARBITRUM_ONE_CHAIN_ID = "0xa4b1";

function normalizeChainId(chainId: string) {
  return chainId.trim().toLowerCase();
}

function getChainLabel(chainId: string) {
  const normalized = normalizeChainId(chainId);

  if (!normalized) return "Unknown network";
  if (normalized === ARBITRUM_ONE_CHAIN_ID) return "Arbitrum One";
  if (normalized === "0x66eee") return "Arbitrum Sepolia";
  if (normalized === "0xa4ba") return "Arbitrum Nova";
  if (normalized === "0x1") return "Ethereum Mainnet";

  return `Chain ${normalized}`;
}

function Home() {
  const [wallet, setWallet] = useState("");
  const [goal, setGoal] = useState(goals[0]);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("balanced");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<WalletOption | null>(
    null,
  );
  const [connectedAddress, setConnectedAddress] = useState("");
  const [connectedWalletName, setConnectedWalletName] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [walletSummary, setWalletSummary] = useState<WalletSummaryResponse | null>(
    null,
  );
  const [walletSummaryLoading, setWalletSummaryLoading] = useState(false);
  const [walletSummaryError, setWalletSummaryError] = useState("");
  const [chainId, setChainId] = useState("");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const ignoreExtensionErrors = (event: ErrorEvent) => {
      if (typeof event.filename !== "string") return;
      if (!event.filename.startsWith("chrome-extension://")) return;

      event.preventDefault();
    };

    const ignoreExtensionRejections = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : typeof event.reason?.message === "string"
            ? event.reason.message
            : "";
      const stack = typeof event.reason?.stack === "string" ? event.reason.stack : "";
      const fullText = `${reason} ${stack}`.toLowerCase();

      if (
        fullText.includes("chrome-extension://") ||
        fullText.includes("origin not allowed")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", ignoreExtensionErrors);
    window.addEventListener("unhandledrejection", ignoreExtensionRejections);

    return () => {
      window.removeEventListener("error", ignoreExtensionErrors);
      window.removeEventListener("unhandledrejection", ignoreExtensionRejections);
    };
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    let active = true;

    void window.ethereum
      .request({ method: "eth_chainId" })
      .then((chainValue) => {
        if (!active || typeof chainValue !== "string") return;
        setChainId(normalizeChainId(chainValue));
      })
      .catch(() => undefined);

    const handleChainChanged = (nextChainIdValue: unknown) => {
      if (typeof nextChainIdValue === "string") {
        setChainId(normalizeChainId(nextChainIdValue));
        return;
      }

      setChainId("");
    };

    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      active = false;
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!connectedAddress) {
      setWalletSummary(null);
      setWalletSummaryError("");
      return;
    }

    let active = true;
    setWalletSummaryLoading(true);
    setWalletSummaryError("");

    void fetch("/api/wallet-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: connectedAddress }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | WalletSummaryResponse
          | { error?: string };

        if (!active) return;

        if (!response.ok) {
          setWalletSummary(null);
          setWalletSummaryError(payload.error ?? "Could not load wallet balances.");
          return;
        }

        setWalletSummary(payload as WalletSummaryResponse);
      })
      .catch(() => {
        if (!active) return;
        setWalletSummary(null);
        setWalletSummaryError("Could not load wallet balances.");
      })
      .finally(() => {
        if (!active) return;
        setWalletSummaryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [connectedAddress]);

  useEffect(() => {
    if (!window.ethereum?.on || !window.ethereum?.removeListener) return;

    const handleAccountsChanged = (accountsValue: unknown) => {
      const accounts = Array.isArray(accountsValue) ? (accountsValue as string[]) : [];

      if (accounts.length === 0) {
        setConnectedAddress("");
        setConnectedWalletName("");
        setWallet("");
        setAnalysis(null);
        return;
      }

      setConnectedAddress(accounts[0]);
      setConnectedWalletName((currentWalletName) => currentWalletName || "Connected wallet");
      setWallet(accounts[0]);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;

  const availableWallets = walletOptions.map((option) => {
    const injected = getInjectedProvider(ethereum, option.id);
    const connectable = option.id === "walletconnect" ? false : Boolean(injected);
    const installed = option.id === "walletconnect" ? true : connectable;

    return {
      ...option,
      connectable,
      installed,
    };
  });
  const connectedChainLabel = chainId ? getChainLabel(chainId) : "Unknown network";
  const isArbitrumOne = chainId === ARBITRUM_ONE_CHAIN_ID;
  const liveStats = [
    { label: "Position", value: "Wallet doctor" },
    {
      label: "Chain",
      value: connectedAddress ? connectedChainLabel : "Awaiting wallet",
    },
    { label: "Output", value: "Action plan" },
  ];

  async function connectWallet(option: WalletOption) {
    setConnectingWallet(option);
    setError("");
    setModalMessage("");

    const walletName =
      walletOptions.find((walletOption) => walletOption.id === option)?.name ??
      "This wallet";

    if (option === "walletconnect") {
      setModalMessage(
        "WalletConnect is marked coming soon until the production project ID is added.",
      );
      setConnectingWallet(null);
      return;
    }

    const provider = getInjectedProvider(window.ethereum, option);

    if (!provider) {
      setModalMessage(
        `${walletName} is not ready in this browser tab. Use Install, then refresh and reconnect.`,
      );
      setConnectingWallet(null);
      return;
    }

    try {
      try {
        await provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Some wallets skip this method; continue with direct account request.
      }

      const requestedAccounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const nextAccounts = Array.isArray(requestedAccounts)
        ? requestedAccounts.filter(
            (account): account is string =>
              typeof account === "string" && account.length > 0,
          )
        : [];

      const accounts = nextAccounts;

      if (accounts.length > 0) {
        const nextChainId = await provider.request({
          method: "eth_chainId",
        });

        setConnectedAddress(accounts[0]);
        setConnectedWalletName(walletName);
        setWallet(accounts[0]);
        if (typeof nextChainId === "string") {
          setChainId(normalizeChainId(nextChainId));
        }
        setIsConnectOpen(false);
        setModalMessage("");
        return;
      }

      setModalMessage(
        `${walletName} did not return an account. Unlock the wallet, approve this site, then try connect again.`,
      );
    } catch {
      setModalMessage(`${walletName} connection was cancelled or blocked by the wallet.`);
    } finally {
      setConnectingWallet(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet,
          goal,
          riskLevel,
          extraContext,
        }),
      });

      const payload = (await response.json()) as
        | AnalysisResponse
        | { error?: string };

      if (!response.ok) {
        setAnalysis(null);
        setError(payload.error ?? "Something went wrong while analyzing.");
        return;
      }

      setAnalysis(normalizeAnalysisResponse(payload));
    } catch {
      setAnalysis(null);
      setError("Network error. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ui-click-motion relative font-ui min-h-screen overflow-hidden bg-[#f4efe6] text-[#171411]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#f4efe6_0%,#efe4c9_48%,#eef5ec_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(255,123,53,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(17,153,142,0.14),transparent_32%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-80 h-80 w-80 rounded-full bg-[#11998e]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-20 h-72 w-72 rounded-full bg-[#ff7b35]/18 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="grid gap-10 border-b border-black/8 pb-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
          <div className="space-y-6 lg:col-span-2">
            <div className="responsive-brand mx-auto w-full max-w-[72rem]">
              <div className="responsive-brand__desktop shadow-[0_10px_30px_rgba(80,61,35,0.08)]">
                <div className="responsive-brand__desktop-box">
                  <div className="responsive-brand__corners" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                  <div className="responsive-brand__desktop-text">ArbiShield MVP</div>
                  <div className="responsive-brand__meta" aria-hidden="true">
                    <span>Arbitrum AI defense layer</span>
                    <span className="responsive-brand__meta-dot" />
                    <span>Live MVP build</span>
                  </div>
                </div>
              </div>
              <div className="responsive-brand__mobile shadow-[0_10px_30px_rgba(80,61,35,0.08)]">
                <div className="responsive-brand__mobile-box">
                  <div className="responsive-brand__mobile-text">ArbiShield MVP</div>
                  <div className="responsive-brand__mobile-meta" aria-hidden="true">
                    Arbitrum AI defense
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:pr-8">
            <div className="space-y-4 lg:flex lg:min-h-[24rem] lg:flex-col lg:items-center lg:justify-center lg:text-center">
              <div className="hero-headline max-w-4xl text-[2.6rem] text-[#171411] sm:text-[3.3rem] lg:text-[4.15rem]">
                <span className="block">Wallet guidance</span>
                <span className="block text-[#ff7b35]">that looks sharp,</span>
                <span className="block text-[#11998e]">thinks clearly,</span>
                <span className="block">and feels premium.</span>
              </div>
              <p className="max-w-[42rem] pt-1 text-[1.03rem] leading-[2.05rem] text-[#554f46] sm:pt-2 sm:text-[1.08rem] sm:leading-[2.12rem]">
                This version feels less like a cold dashboard and more like a
                trusted decision layer for Arbitrum users who want simpler,
                safer next moves.
              </p>
            </div>
          </div>

          <div className={darkBoxClassName("p-6 text-[#f6efe4]")}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#b9ac99]">
                  Shield Core
                </p>
                <h2 className="font-headline mt-2 text-[2.6rem]">
                  Safer by design
                </h2>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="bg-[#dff5ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f4a44]">
                  Live
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMessage("");
                      setIsConnectOpen(true);
                    }}
                    className="border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                  >
                    {connectedAddress ? formatWalletAddress(connectedAddress) : "Connect"}
                  </button>
                  {connectedAddress ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConnectedAddress("");
                        setConnectedWalletName("");
                        setWallet("");
                        setAnalysis(null);
                        setWalletSummary(null);
                        setWalletSummaryError("");
                      }}
                      aria-label="Disconnect wallet"
                      className="grid h-9 w-9 place-items-center border border-white/10 bg-white/5 text-sm text-white transition hover:bg-white/10"
                    >
                      x
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {liveStats.map((stat) => (
                <div key={stat.label} className="border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9ac99]">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-[linear-gradient(135deg,#ff7b35_0%,#ffbe7e_58%,#daf2e8_100%)] p-[1px]">
              <div className="bg-[#221d18] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#d7ffe9]/75">
                  Network status
                </p>
                <p className="mt-3 text-sm leading-7 text-[#f6efe4]">
                  {!connectedAddress
                    ? "Connect a wallet to verify chain status and unlock live mainnet checks."
                    : isArbitrumOne
                      ? "Mainnet confirmed. Wallet is connected on Arbitrum One and ready for live guidance."
                      : `Connected on ${connectedChainLabel}. Switch to Arbitrum One for true mainnet flow.`}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9ac99]">
                  Wallet status
                </p>
                <p className="mt-2 text-sm text-white">
                  {connectedAddress
                    ? `${connectedWalletName || "Connected wallet"} linked to ${formatWalletAddress(connectedAddress)} on ${connectedChainLabel}`
                    : "No wallet connected yet. Use the connect button for a live demo flow."}
                </p>
              </div>
              <div className="border border-white/10 bg-white/5 px-4 py-4 sm:min-w-[160px]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9ac99]">
                  Session
                </p>
                <p className="mt-2 text-sm text-white">
                  {connectedAddress ? (isArbitrumOne ? "Mainnet active" : "Check network") : "Preview mode"}
                </p>
              </div>
            </div>

            <div className="mt-6 border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9ac99]">
                  Wallet balances
                </p>
                {walletSummaryLoading ? (
                  <span className="text-[11px] uppercase tracking-[0.22em] text-[#d9ccb8]">
                    Loading
                  </span>
                ) : null}
              </div>

              {walletSummary ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#b9ac99]">
                      {walletSummary.native.symbol}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {walletSummary.native.balance}
                    </p>
                  </div>
                  {walletSummary.tokens.slice(0, 4).map((token) => (
                    <div
                      key={token.symbol}
                      className="border border-white/10 bg-black/20 px-4 py-4"
                    >
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#b9ac99]">
                        {token.symbol}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {token.balance}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#d9ccb8]">
                  {walletSummaryError || "Connect a wallet to load live Arbitrum balances."}
                </p>
              )}
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className={boxClassName("p-6 backdrop-blur xl:p-8")}>
            <div className="mb-8 space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#ff7b35]">
                Analyze Wallet
              </p>
              <h2 className="font-headline max-w-none text-[3rem] text-[#171411] sm:text-[3.6rem]">
                Create a cleaner wallet report
              </h2>
              <p className="max-w-none text-sm leading-7 text-[#5f584d]">
                Paste a wallet, choose the user goal, and let the agent produce
                safer recommendations that are easier to present and easier to
                trust.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#26211b]">
                  Primary goal
                </span>
                <select
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="w-full border border-black/10 bg-[#fffaf2] px-5 py-4 text-sm text-[#171411] outline-none transition focus:border-[#11998e] focus:bg-white"
                >
                  {goals.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-[#26211b]">
                  Risk preference
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["low", "balanced", "high"] as RiskLevel[]).map((item) => {
                    const selected = riskLevel === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRiskLevel(item)}
                        className={`border px-4 py-4 text-left text-sm capitalize transition ${
                          selected
                            ? "border-[#171411] bg-[#171411] text-[#f6efe4] shadow-[0_18px_36px_rgba(23,20,17,0.12)]"
                            : "border-black/10 bg-[#fffaf2] text-[#3b342b] hover:border-[#11998e]/35 hover:bg-white"
                        }`}
                      >
                        <span className="block font-semibold">{item}</span>
                        <span
                          className={`mt-1 block text-xs ${
                            selected ? "text-[#d8cdbd]" : "text-[#867d70]"
                          }`}
                        >
                          {item === "low" && "Prefer capital protection first."}
                          {item === "balanced" &&
                            "Mix safety with reasonable upside."}
                          {item === "high" && "Comfortable with active risk."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-black/10 bg-[#fffaf2] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8d857a]">
                    Wallet input
                  </p>
                  <p className="mt-2 text-sm text-[#3b342b]">
                    {connectedAddress
                      ? formatWalletAddress(connectedAddress)
                      : "Waiting for wallet connection"}
                  </p>
                </div>
                <div className="border border-black/10 bg-[#fffaf2] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8d857a]">
                    Live balance
                  </p>
                  <p className="mt-2 text-sm text-[#3b342b]">
                    {walletSummary?.native.balance
                      ? `${walletSummary.native.balance} ETH`
                      : "Waiting for wallet data"}
                  </p>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#26211b]">
                  Extra context
                </span>
                <textarea
                  value={extraContext}
                  onChange={(event) => setExtraContext(event.target.value)}
                  placeholder="Example: I am new to DeFi and want fewer risky tokens."
                  rows={5}
                  className="w-full border border-black/10 bg-[#fffaf2] px-5 py-4 text-sm text-[#171411] outline-none placeholder:text-[#a0988d] transition focus:border-[#11998e] focus:bg-white"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center bg-[#171411] px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#f6efe4] shadow-[0_20px_40px_rgba(23,20,17,0.16)] transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Analyzing wallet..." : "Run AI analysis"}
              </button>

              {error ? (
                <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {error}
                </p>
              ) : null}
            </form>
          </div>

          <div className="flex flex-col gap-6">
            <div className={darkBoxClassName("p-6 text-[#f6efe4] xl:p-8")}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#8ae6da]">
                    Live Report
                  </p>
                  <h2 className="font-headline mt-2 max-w-lg text-[3rem] sm:text-[3.5rem]">
                    Wallet health snapshot
                  </h2>
                </div>
                <div className="border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#d9ccb8]">
                  {analysis ? `${analysis.healthScore}/100` : "Awaiting scan"}
                </div>
              </div>

              {analysis ? (
                <div className="mt-6 space-y-6">
                  <div className="bg-[linear-gradient(135deg,#fff0df_0%,#ffdcb9_44%,#daf2e8_100%)] p-[1px]">
                    <div className="bg-[#211b15] p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-[#ffd3b1]">
                        Summary
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#f6efe4]">
                        {analysis.summary}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border border-white/10 bg-white/[0.045] p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-[#bbaea0]">
                        Warnings
                      </p>
                      <ul className="mt-3 space-y-3 text-sm leading-6 text-[#f6efe4]">
                        {analysis.warnings.map((warning) => (
                          <li key={warning} className="rounded-2xl bg-black/20 px-3 py-2">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-white/10 bg-white/[0.045] p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-[#bbaea0]">
                        Opportunities
                      </p>
                      <ul className="mt-3 space-y-3 text-sm leading-6 text-[#f6efe4]">
                        {analysis.opportunities.map((item) => (
                          <li key={item} className="rounded-2xl bg-black/20 px-3 py-2">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#8ae6da]">
                      Recommended Actions
                    </p>
                    {analysis.recommendations.map((item) => (
                      <article
                        key={item.title}
                        className="border border-[#d9d0c2] bg-[#f8f1e7] p-5 text-[#171411] shadow-[0_10px_24px_rgba(23,20,17,0.05)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">
                              {item.title}
                            </h3>
                            <p className="text-sm leading-6 text-[#50473d]">
                              {item.detail}
                            </p>
                          </div>
                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${urgencyClasses[item.urgency]}`}
                          >
                            {item.urgency} urgency
                          </span>
                        </div>
                        <div className="mt-4 border border-dashed border-[#11998e]/30 bg-[#dff5ec] px-4 py-3 text-sm text-[#144842]">
                          Suggested action: {item.action}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="bg-[#f8f1e7] p-5 text-[#171411]">
                    <p className="text-sm uppercase tracking-[0.22em] text-[#7b7367]">
                      Next step
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#3f382f]">
                      {analysis.nextStep}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="bg-[linear-gradient(160deg,#ff7b35_0%,#ffc17f_100%)] p-6 text-[#21170f] shadow-[0_16px_32px_rgba(255,123,53,0.18)]">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#5a351f]">
                      Empty State
                    </p>
                    <h3 className="font-headline mt-3 text-[2.5rem]">
                      Waiting for a wallet worth improving.
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#593620]">
                      Run the analysis to generate clear risk notes, safer next
                      actions, and a user-friendly summary.
                    </p>
                  </div>

                  <div className="border border-white/10 bg-white/[0.045] p-6">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#bbaea0]">
                      Demo Prompt
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#f6efe4]">
                      &ldquo;I&apos;m new to Arbitrum. I want less risk, a
                      simpler wallet, and only recommendations I can understand
                      quickly.&rdquo;
                    </p>
                    <div className="mt-5 border border-dashed border-white/12 px-4 py-4 text-sm text-[#d9ccb8]">
                      Use <span className="font-semibold text-white">demo-wallet</span>{" "}
                      if you want to showcase the flow without using a real
                      address during the demo.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className={boxClassName("p-6")}>
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#11998e]">
                  Demo Flow
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[#322c25]">
                  <div className="border border-black/8 bg-white px-4 py-3">
                    1. Paste an Arbitrum wallet or demo address.
                  </div>
                  <div className="border border-black/8 bg-white px-4 py-3">
                    2. Select a goal and user-friendly risk profile.
                  </div>
                  <div className="border border-black/8 bg-white px-4 py-3">
                    3. Generate a clearer safety report with action ideas.
                  </div>
                  <div className="border border-black/8 bg-white px-4 py-3">
                    4. Turn the best recommendation into the next simulation.
                  </div>
                </div>
              </div>

              <div className="border border-[#c9e8df] bg-[#dff5ec] p-6 shadow-[0_24px_60px_rgba(17,153,142,0.08)]">
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#0d5b54]">
                  Product Angle
                </p>
                <h3 className="font-headline mt-3 text-[2.5rem] text-[#17352f]">
                  Not more crypto noise. Better decisions.
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#325a54]">
                  This product focuses on one thing: clearer and safer onchain
                  decisions for everyday users.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isConnectOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl border border-black/10 bg-[#f8f3ea] p-6 shadow-[0_30px_90px_rgba(23,20,17,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-black/8 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7a7369]">
                  Connect wallet
                </p>
                <h3 className="font-headline mt-3 text-[2.3rem] text-[#171411]">
                  Pick the easiest option
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-[#5c564d]">
                  Installed wallets connect directly in this browser. If a
                  wallet is missing, use Install.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectOpen(false)}
                className="border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#171411]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {availableWallets.map((option) => (
                <div
                  key={option.id}
                  className="grid gap-4 border border-black/10 bg-white px-4 py-4 text-left transition hover:border-[#171411] hover:shadow-[0_10px_28px_rgba(23,20,17,0.08)] sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    {walletIcon(option.id)}
                    <div>
                      <p className="font-headline text-[1.2rem] leading-none text-[#171411] sm:text-[1.4rem]">
                        {option.name}
                      </p>
                      <p className="mt-1 max-w-[22rem] text-sm text-[#5d564d]">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div
                      className="inline-flex min-w-[64px] justify-center px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        backgroundColor:
                          option.id === "walletconnect"
                            ? "#ece6dd"
                            : option.connectable
                              ? `${option.accent}22`
                              : "#ece6dd",
                        color:
                          option.id === "walletconnect"
                            ? "#756f66"
                            : option.connectable
                              ? option.accent
                              : "#756f66",
                      }}
                    >
                      {connectingWallet === option.id
                        ? "Connecting"
                        : option.id === "walletconnect"
                          ? "Soon"
                          : option.connectable
                            ? "Ready"
                            : "Install"}
                    </div>
                    {option.id === "walletconnect" ? (
                      <button
                        type="button"
                        onClick={() => void connectWallet(option.id)}
                        className="min-w-[118px] border border-black/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#171411] transition hover:border-[#171411] hover:bg-[#f8f3ea]"
                      >
                        Coming soon
                      </button>
                    ) : option.connectable ? (
                      <button
                        type="button"
                        onClick={() => void connectWallet(option.id)}
                        className="min-w-[118px] border border-black/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#171411] transition hover:border-[#171411] hover:bg-[#f8f3ea]"
                      >
                        {connectingWallet === option.id
                          ? "Connecting"
                          : connectedWalletName === option.name && connectedAddress
                            ? "Connected"
                            : "Connect"}
                      </button>
                    ) : option.installUrl ? (
                      <a
                        href={option.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-[118px] border border-black/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#171411] transition hover:border-[#171411] hover:bg-[#f8f3ea]"
                      >
                        Install
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {modalMessage ? (
              <div className="mt-6 border border-[#ffb587] bg-[#fff1e5] p-4 text-sm text-[#8d4d1e]">
                {modalMessage}
              </div>
            ) : null}

            <div className="mt-6 border border-black/8 bg-[#fffaf2] p-4 text-sm text-[#595349]">
              {connectedAddress
                ? `Connected wallet: ${connectedWalletName || "Wallet"} ${connectedAddress}`
                : "Tip: connect one wallet here, then run the analysis flow."}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default dynamic(() => Promise.resolve(Home), { ssr: false });
