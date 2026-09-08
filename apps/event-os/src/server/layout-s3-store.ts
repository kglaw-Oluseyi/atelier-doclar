import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { assertSafeObjectKey, MemoryLayoutBinaryStore, type LayoutBinaryObject, type LayoutBinaryStore } from "@maison-doclar/shared-platform";

const fixtureGlobal = globalThis as typeof globalThis & { __eosFixtureExportStore?: MemoryLayoutBinaryStore };

export function fixtureExportStoreEnabled(): boolean {
  return env("EVENT_OS_LAYOUT_EXPORT_FIXTURE_STORE") === "1" && !layoutAssetEnvBound();
}

export function resolveLayoutBinaryStore(): LayoutBinaryStore | undefined {
  const bound = createLayoutBinaryStoreFromEnv();
  if (bound) return bound;
  if (!fixtureExportStoreEnabled()) return undefined;
  fixtureGlobal.__eosFixtureExportStore ??= new MemoryLayoutBinaryStore();
  return fixtureGlobal.__eosFixtureExportStore;
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export type LayoutAssetStoreStatus = "READY" | "UNCONFIGURED" | "ERROR";

export function layoutExportEnabled(): boolean {
  return env("EVENT_OS_LAYOUT_EXPORT_ENABLED") === "1";
}

export function layoutAssetEnvBound(): boolean {
  return (
    env("EVENT_OS_LAYOUT_ASSET_STORE_PROVIDER") === "railway-bucket" &&
    Boolean(env("EVENT_OS_LAYOUT_ASSET_BUCKET")) &&
    Boolean(env("EVENT_OS_LAYOUT_ASSET_ENDPOINT")) &&
    Boolean(env("EVENT_OS_LAYOUT_ASSET_REGION")) &&
    Boolean(env("EVENT_OS_LAYOUT_ASSET_ACCESS_KEY")) &&
    Boolean(env("EVENT_OS_LAYOUT_ASSET_SECRET_KEY")) &&
    env("EVENT_OS_LAYOUT_ASSET_SCANNER") === "in-process-content-safety"
  );
}

export function createLayoutBinaryStoreFromEnv(): LayoutBinaryStore | undefined {
  if (!layoutAssetEnvBound()) return undefined;
  const bucket = env("EVENT_OS_LAYOUT_ASSET_BUCKET")!;
  const client = new S3Client({
    region: env("EVENT_OS_LAYOUT_ASSET_REGION") ?? "auto",
    endpoint: env("EVENT_OS_LAYOUT_ASSET_ENDPOINT"),
    forcePathStyle: env("EVENT_OS_LAYOUT_ASSET_URL_STYLE") !== "virtual-host",
    credentials: {
      accessKeyId: env("EVENT_OS_LAYOUT_ASSET_ACCESS_KEY")!,
      secretAccessKey: env("EVENT_OS_LAYOUT_ASSET_SECRET_KEY")!,
    },
  });
  return {
    configured: true,
    async put(object: LayoutBinaryObject) {
      assertSafeObjectKey(object.key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: object.key,
          Body: Buffer.from(object.bytes),
          ContentType: object.contentType,
          CacheControl: "private, no-store",
        }),
      );
    },
    async get(key: string) {
      assertSafeObjectKey(key);
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = result.Body ? new Uint8Array(await result.Body.transformToByteArray()) : undefined;
        if (!bytes) return undefined;
        return { key, bytes, contentType: result.ContentType ?? "application/octet-stream" };
      } catch {
        return undefined;
      }
    },
    async delete(key: string) {
      assertSafeObjectKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export async function probeLayoutAssetStore(store: LayoutBinaryStore | undefined): Promise<LayoutAssetStoreStatus> {
  if (!store?.configured) return "UNCONFIGURED";
  try {
    const bucket = env("EVENT_OS_LAYOUT_ASSET_BUCKET");
    const endpoint = env("EVENT_OS_LAYOUT_ASSET_ENDPOINT");
    if (!bucket || !endpoint) return "UNCONFIGURED";
    const client = new S3Client({
      region: env("EVENT_OS_LAYOUT_ASSET_REGION") ?? "auto",
      endpoint,
      forcePathStyle: env("EVENT_OS_LAYOUT_ASSET_URL_STYLE") !== "virtual-host",
      credentials: {
        accessKeyId: env("EVENT_OS_LAYOUT_ASSET_ACCESS_KEY")!,
        secretAccessKey: env("EVENT_OS_LAYOUT_ASSET_SECRET_KEY")!,
      },
    });
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return "READY";
  } catch {
    return "ERROR";
  }
}
