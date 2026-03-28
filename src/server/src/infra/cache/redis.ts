import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

let hasLoggedUnavailableState = false;

const redis = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times < 3 ? Math.min(times * 200, 1000) : null),
    })
  : null;

const logUnavailable = (error?: unknown) => {
  if (hasLoggedUnavailableState) return;

  const message =
    error instanceof Error ? error.message : "Redis connection failed";

  console.warn(
    `[REDIS] Unavailable (${message}). Continuing in degraded mode.`
  );

  hasLoggedUnavailableState = true;
};

if (!redis) {
  console.warn(
    "[REDIS] REDIS_URL is not set. Continuing without Redis-backed features."
  );
} else {
  redis
    .on("ready", () => {
      hasLoggedUnavailableState = false;
      console.log("[REDIS] Connected");
    })
    .on("end", () => {
      logUnavailable(new Error("Redis connection closed"));
    })
    .on("error", (err) => {
      logUnavailable(err);
    });
}

export const isRedisReady = (): boolean =>
  redis?.status === "ready" || redis?.status === "connect";

export const ensureRedisConnection = async (): Promise<boolean> => {
  if (!redis) return false;

  if (isRedisReady()) return true;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    } else {
      await redis.ping();
    }

    return isRedisReady();
  } catch (error) {
    logUnavailable(error);
    return false;
  }
};

export default redis;
