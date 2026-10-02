FROM eclipse-temurin:21-jdk-jammy

ARG KOTLIN_VERSION=2.0.21
# Optional but recommended: pin the checksum (see step 4)
ARG KOTLIN_SHA256=""

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl unzip ca-certificates \
 && curl -fsSL -o /tmp/kotlin.zip \
      "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" \
 && if [ -n "$KOTLIN_SHA256" ]; then echo "${KOTLIN_SHA256}  /tmp/kotlin.zip" | sha256sum -c -; fi \
 && unzip -q /tmp/kotlin.zip -d /opt \
 && rm /tmp/kotlin.zip \
 && apt-get purge -y curl unzip \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/kotlinc/bin:${PATH}"
WORKDIR /work
