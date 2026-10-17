-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "key" VARCHAR(191) NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminMutationResult" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMutationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt");

-- CreateIndex
CREATE INDEX "AdminMutationResult_createdAt_idx" ON "AdminMutationResult"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminMutationResult_actorUserId_idempotencyKey_key" ON "AdminMutationResult"("actorUserId", "idempotencyKey");
