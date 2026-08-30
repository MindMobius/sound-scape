#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncRuntimeAssets } from "./sync-runtime-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const applicationRoot = path.join(repositoryRoot, "apps", "client");
const expectedVersionFile = path.join(applicationRoot, ".flutter-version");
const isWindows = process.platform === "win32";

const flutterEnvironment = {
  ...process.env,
  PUB_HOSTED_URL: process.env.PUB_HOSTED_URL || "https://pub.flutter-io.cn",
  FLUTTER_STORAGE_BASE_URL: process.env.FLUTTER_STORAGE_BASE_URL || "https://storage.flutter-io.cn",
};

function executableAt(sdkRoot, executableName) {
  if (!sdkRoot) return null;
  const executable = path.join(
    sdkRoot,
    "bin",
    isWindows ? `${executableName}.bat` : executableName,
  );
  return fs.existsSync(executable) ? executable : null;
}

function sdkFromAndroidProperties() {
  const propertiesPath = path.join(applicationRoot, "android", "local.properties");
  if (!fs.existsSync(propertiesPath)) return null;

  const match = fs.readFileSync(propertiesPath, "utf8").match(/^flutter\.sdk=(.+)$/m);
  if (!match) return null;

  return match[1].trim().replace(/\\\\/g, "\\").replace(/\\:/g, ":");
}

function sdkFromPath() {
  const locator = isWindows ? "where.exe" : "which";
  const result = spawnSync(locator, ["flutter"], {
    encoding: "utf8",
    env: flutterEnvironment,
    windowsHide: true,
  });
  if (result.status !== 0) return null;

  const executable = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return executable ? path.dirname(path.dirname(executable)) : null;
}

function resolveFlutterSdk() {
  const candidates = [
    path.join(repositoryRoot, ".fvm", "flutter_sdk"),
    process.env.FLUTTER_ROOT,
    sdkFromPath(),
    sdkFromAndroidProperties(),
  ];

  for (const candidate of candidates) {
    if (executableAt(candidate, "flutter")) return path.resolve(candidate);
  }

  throw new Error(
    "Flutter SDK not found. Add flutter/bin to PATH, set FLUTTER_ROOT, " +
      "or run Flutter once so android/local.properties contains flutter.sdk.",
  );
}

function run(executable, args, { capture = false } = {}) {
  let command = executable;
  let commandArguments = args;
  let useWindowsShell = false;
  if (isWindows && executable.endsWith(".bat")) {
    const unsafeArgument = [executable, ...args].find((value) => /[\r\n"&|<>^%!]/.test(value));
    if (unsafeArgument) {
      throw new Error(`Unsafe Windows command argument '${unsafeArgument}'.`);
    }
    command = `call "${executable}" ${args.map((value) => `"${value}"`).join(" ")}`;
    commandArguments = [];
    useWindowsShell = true;
  }

  const options = {
    cwd: applicationRoot,
    encoding: capture ? "utf8" : undefined,
    env: flutterEnvironment,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: useWindowsShell,
    windowsHide: true,
  };
  const result = useWindowsShell
    ? spawnSync(command, options)
    : spawnSync(command, commandArguments, options);

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? result.stderr.trim() : "";
    throw new Error(
      `${path.basename(executable)} ${args.join(" ")} failed` + (detail ? `: ${detail}` : ""),
    );
  }
  return capture ? result.stdout : "";
}

function verifyFlutterVersion(flutterExecutable) {
  const expectedVersion = fs.readFileSync(expectedVersionFile, "utf8").trim();
  const version = JSON.parse(run(flutterExecutable, ["--version", "--machine"], { capture: true }));

  if (version.frameworkVersion !== expectedVersion) {
    throw new Error(
      `Flutter ${expectedVersion} is required, but ${version.frameworkVersion} ` +
        `was found at ${version.flutterRoot}.`,
    );
  }

  console.log(
    `[soundscape] Flutter ${version.frameworkVersion} (${version.channel}) ` +
      `at ${version.flutterRoot}`,
  );
}

function selectDevice(
  flutterExecutable,
  { requestedDeviceId, targetPlatformPrefix, label, startInstruction },
) {
  const devices = JSON.parse(
    run(flutterExecutable, ["devices", "--machine"], { capture: true }),
  ).filter((device) => device.targetPlatform?.startsWith(targetPlatformPrefix));

  if (requestedDeviceId) {
    if (!/^[a-zA-Z0-9._:-]+$/.test(requestedDeviceId)) {
      throw new Error(`${label} device id '${requestedDeviceId}' is invalid.`);
    }
    const requested = devices.find((device) => device.id === requestedDeviceId);
    if (!requested) {
      throw new Error(
        `${label} device '${requestedDeviceId}' is not connected. ` +
          "Run npm run client:devices to inspect available targets.",
      );
    }
    return requested.id;
  }

  if (devices.length === 0) {
    throw new Error(`No ${label} device is connected. ${startInstruction}`);
  }
  if (devices.length > 1) {
    const choices = devices.map((device) => device.id).join(", ");
    throw new Error(
      `Multiple ${label} devices are connected (${choices}). ` +
        `Pass one id after "node tools/flutter.mjs run ${targetPlatformPrefix}".`,
    );
  }
  return devices[0].id;
}

function selectAndroidDevice(flutterExecutable, requestedDeviceId) {
  return selectDevice(flutterExecutable, {
    requestedDeviceId,
    targetPlatformPrefix: "android",
    label: "Android",
    startInstruction: "Start one emulator or connect one phone.",
  });
}

function selectIosDevice(flutterExecutable, requestedDeviceId) {
  if (process.platform !== "darwin") {
    throw new Error("iOS development requires macOS and Xcode.");
  }
  return selectDevice(flutterExecutable, {
    requestedDeviceId,
    targetPlatformPrefix: "ios",
    label: "iOS",
    startInstruction: "Start one Simulator or connect one iPhone.",
  });
}

function desktopDeviceId() {
  const target =
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "macos"
        : process.platform === "linux"
          ? "linux"
          : null;
  if (target && fs.existsSync(path.join(applicationRoot, target))) return target;
  throw new Error(
    `This checkout has no ${target ?? process.platform} desktop host. ` +
      "Use Windows for desktop development, or run a configured mobile target.",
  );
}

function printHelp() {
  console.log(`Usage: node tools/flutter.mjs <command>

Commands:
  doctor                   Validate the pinned SDK and report platform toolchains
  setup                    Validate the SDK, restore packages, and run doctor
  devices                  List connected Flutter targets
  run desktop              Run the native desktop app in debug mode
  run android [device-id]  Run the Android app on one connected target
  run ios [device-id]      Run the iOS app on one connected macOS target
  check                    Check formatting, analyze, and run headless tests
  test                     Run headless Flutter tests
  integration windows      Run the native integration test on Windows
  integration android      Run it on one connected Android target
  build windows            Build the Windows debug bundle
  build android            Build the Android debug APK
  build ios                Build the unsigned iOS debug app on macOS`);
}

function main() {
  const [command = "help", target, deviceId] = process.argv.slice(2);
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "devices" && command !== "doctor") syncRuntimeAssets();

  const sdkRoot = resolveFlutterSdk();
  const pathKey =
    Object.keys(flutterEnvironment).find((key) => key.toLowerCase() === "path") || "PATH";
  flutterEnvironment[pathKey] = [path.join(sdkRoot, "bin"), flutterEnvironment[pathKey]]
    .filter(Boolean)
    .join(path.delimiter);
  flutterEnvironment.FLUTTER_ROOT = sdkRoot;
  const flutterExecutable = executableAt(sdkRoot, "flutter");
  const dartExecutable = executableAt(sdkRoot, "dart");
  verifyFlutterVersion(flutterExecutable);

  switch (command) {
    case "doctor":
      run(flutterExecutable, ["doctor", "-v"]);
      return;
    case "setup":
      if (isWindows) {
        run(flutterExecutable, ["config", "--enable-windows-desktop"]);
      }
      run(flutterExecutable, ["pub", "get"]);
      run(flutterExecutable, ["doctor", "-v"]);
      return;
    case "devices":
      run(flutterExecutable, ["devices"]);
      return;
    case "run": {
      if (target === "desktop") {
        run(flutterExecutable, ["run", "-d", desktopDeviceId(), "--debug"]);
        return;
      }
      if (target === "android") {
        const selectedDevice = selectAndroidDevice(flutterExecutable, deviceId);
        run(flutterExecutable, ["run", "-d", selectedDevice, "--debug"]);
        return;
      }
      if (target === "ios") {
        const selectedDevice = selectIosDevice(flutterExecutable, deviceId);
        run(flutterExecutable, ["run", "-d", selectedDevice, "--debug"]);
        return;
      }
      throw new Error("Run target must be desktop, android, or ios.");
    }
    case "check":
      run(dartExecutable, [
        "format",
        "--output=none",
        "--set-exit-if-changed",
        "lib",
        "test",
        "integration_test",
      ]);
      run(flutterExecutable, ["analyze"]);
      run(flutterExecutable, ["test"]);
      return;
    case "test":
      run(flutterExecutable, ["test"]);
      return;
    case "integration":
      if (target === "windows") {
        if (!isWindows) {
          throw new Error("Windows integration tests must run on Windows.");
        }
        run(flutterExecutable, ["test", "integration_test", "-d", "windows"]);
        return;
      }
      if (target === "android") {
        const selectedDevice = selectAndroidDevice(flutterExecutable, deviceId);
        run(flutterExecutable, ["test", "integration_test", "-d", selectedDevice]);
        return;
      }
      throw new Error("Integration target must be windows or android.");
    case "build":
      if (target === "windows") {
        if (!isWindows) {
          throw new Error("Windows builds must run on Windows.");
        }
        run(flutterExecutable, ["build", "windows", "--debug"]);
        return;
      }
      if (target === "android") {
        run(flutterExecutable, ["build", "apk", "--debug"]);
        return;
      }
      if (target === "ios") {
        if (process.platform !== "darwin") {
          throw new Error("iOS builds must run on macOS.");
        }
        run(flutterExecutable, ["build", "ios", "--debug", "--no-codesign"]);
        return;
      }
      throw new Error("Build target must be windows, android, or ios.");
    default:
      throw new Error(`Unknown command '${command}'. Run with --help.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`\n[soundscape] ${error.message}`);
  process.exitCode = 1;
}
