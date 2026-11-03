CREATE TABLE "InformationRequestRateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InformationRequestRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "InformationRequestRateLimit_windowStart_idx" ON "InformationRequestRateLimit"("windowStart");
