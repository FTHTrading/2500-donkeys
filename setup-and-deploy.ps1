<# 
  2500-Donkeys: One-Click Setup & Deploy Script
  ==============================================
  Run from project root:  .\setup-and-deploy.ps1
  
  What it does:
    1. Validates environment (.env, Node.js, npm, Hardhat)
    2. Installs dependencies (if needed)
    3. Compiles all Solidity contracts
    4. Runs the full test suite
    5. Checks wallet balance on Polygon mainnet
    6. Optionally deploys contracts you choose
    7. Optionally verifies on Polygonscan
    
  Flags:
    -SkipTests        Skip the test suite
    -DeployTarget     "amoy" or "polygon" (default: none, just compile+test)
    -VerifyOnly       Skip deploy, just verify existing contracts
    -DryRun           Show what would happen without executing
#>

param(
    [switch]$SkipTests,
    [string]$DeployTarget,    # "amoy" or "polygon"
    [switch]$VerifyOnly,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

# --- Colors ---
function Write-Step   { param($msg) Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] STEP: $msg" -ForegroundColor Cyan }
function Write-OK     { param($msg) Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function Write-Fail   { param($msg) Write-Host "  FAIL: $msg" -ForegroundColor Red }
function Write-Info   { param($msg) Write-Host "  $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host " The 2,500 Donkeys - Setup & Deploy Script" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# ===== STEP 1: Validate Environment =====
Write-Step "Validating environment"

# Check we're in the project root
if (-not (Test-Path "$ProjectRoot\hardhat.config.js")) {
    Write-Fail "hardhat.config.js not found. Run this script from the project root."
    Write-Info "Usage: cd C:\Users\Kevan\2500-donkeys; .\setup-and-deploy.ps1"
    exit 1
}
Write-OK "Project root confirmed: $ProjectRoot"

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Fail "Node.js not found. Install from https://nodejs.org"
    exit 1
}
Write-OK "Node.js $nodeVersion"

# Check npm
$npmVersion = npm --version 2>$null
Write-OK "npm v$npmVersion"

# ===== STEP 2: Validate .env =====
Write-Step "Checking .env file"

$envFile = "$ProjectRoot\.env"
if (-not (Test-Path $envFile)) {
    Write-Fail ".env file not found at $envFile"
    Write-Info ""
    Write-Info "Create it with these required keys:"
    Write-Info "  PRIVATE_KEY=<64-char hex, no 0x prefix>"
    Write-Info "  POLYGON_RPC=<RPC URL>"
    Write-Info "  POLYGONSCAN_API_KEY=<for contract verification>"
    Write-Info ""
    Write-Info "Optional keys:"
    Write-Info "  AMOY_RPC, AUTHOR_WALLET, GITHUB_PAT, ELEVENLABS_API_KEY,"
    Write-Info "  IPFS_API, IPFS_GATEWAY, OPENAI_API_KEY"
    exit 1
}

# Validate required keys exist
$envContent = Get-Content $envFile -Raw
$requiredKeys = @("PRIVATE_KEY")
$warnKeys = @("POLYGON_RPC", "POLYGONSCAN_API_KEY")

foreach ($key in $requiredKeys) {
    if ($envContent -notmatch "(?m)^$key=.+") {
        Write-Fail "Required key '$key' missing or empty in .env"
        exit 1
    }
    # Check PRIVATE_KEY length
    if ($key -eq "PRIVATE_KEY") {
        $match = [regex]::Match($envContent, "(?m)^PRIVATE_KEY=(.+)")
        if ($match.Success) {
            $pkLen = $match.Groups[1].Value.Trim().Length
            if ($pkLen -ne 64) {
                Write-Fail "PRIVATE_KEY should be 64 hex chars (got $pkLen). Do NOT include 0x prefix."
                exit 1
            }
            Write-OK "PRIVATE_KEY present [64 chars]"
        }
    }
}

foreach ($key in $warnKeys) {
    if ($envContent -notmatch "(?m)^$key=.+") {
        Write-Warn "'$key' missing - some features may not work"
    } else {
        Write-OK "$key present"
    }
}

# Check .gitignore protects .env
$gitignore = "$ProjectRoot\.gitignore"
if (Test-Path $gitignore) {
    if ((Get-Content $gitignore -Raw) -match "(?m)^\.env") {
        Write-OK ".env is protected by .gitignore"
    } else {
        Write-Warn ".env is NOT in .gitignore - your private key could be committed!"
    }
}

# ===== STEP 3: Install Dependencies =====
Write-Step "Checking dependencies"

if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Info "node_modules not found, running npm install..."
    if (-not $DryRun) {
        Push-Location $ProjectRoot
        npm install
        Pop-Location
    } else {
        Write-Info "[DRY RUN] Would run: npm install"
    }
} else {
    Write-OK "node_modules exists"
}

# Verify Hardhat is accessible
$hhVersion = npx hardhat --version 2>$null
if (-not $hhVersion) {
    Write-Fail "Hardhat not found. Run: npm install"
    exit 1
}
Write-OK "Hardhat v$hhVersion"

# ===== STEP 4: Compile Contracts =====
Write-Step "Compiling Solidity contracts"

if (-not $DryRun) {
    Push-Location $ProjectRoot
    $compileOutput = npx hardhat compile 2>&1 | Out-String
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Compilation failed:"
        Write-Host $compileOutput
        exit 1
    }
    Write-OK "All contracts compiled successfully"
    # Count compiled contracts
    $artifactContracts = Get-ChildItem "$ProjectRoot\web3\artifacts\web3\contracts" -Directory -ErrorAction SilentlyContinue
    if ($artifactContracts) {
        Write-Info "Contracts: $($artifactContracts.Name -join ', ')"
    }
} else {
    Write-Info "[DRY RUN] Would run: npx hardhat compile"
}

# ===== STEP 5: Run Tests =====
if ($SkipTests) {
    Write-Step "Skipping tests (-SkipTests flag)"
} else {
    Write-Step "Running test suite"
    if (-not $DryRun) {
        Push-Location $ProjectRoot
        $testOutput = npx hardhat test 2>&1 | Out-String
        Pop-Location
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Tests failed:"
            Write-Host $testOutput
            exit 1
        }
        # Extract pass count
        $passMatch = [regex]::Match($testOutput, "(\d+) passing")
        if ($passMatch.Success) {
            Write-OK "$($passMatch.Groups[1].Value) tests passing"
        } else {
            Write-OK "Tests completed"
        }
    } else {
        Write-Info "[DRY RUN] Would run: npx hardhat test"
    }
}

# ===== STEP 6: Check Wallet Balance =====
if ($DeployTarget -or $VerifyOnly) {
    Write-Step "Checking wallet balance"
    $network = if ($DeployTarget) { $DeployTarget } else { "polygon" }
    
    if (-not $DryRun) {
        Push-Location $ProjectRoot
        $balanceOutput = npx hardhat run web3/scripts/check-balance.js --network $network 2>&1 | Out-String
        Pop-Location
        Write-Host $balanceOutput
        
        # Extract balance
        $balMatch = [regex]::Match($balanceOutput, "Balance:\s+([\d.]+)")
        if ($balMatch.Success) {
            $balance = [double]$balMatch.Groups[1].Value
            if ($balance -lt 0.01) {
                Write-Warn "Balance is very low ($balance POL). You may not have enough gas."
            } else {
                Write-OK "Balance: $balance POL - sufficient for deployment"
            }
        }
    } else {
        Write-Info "[DRY RUN] Would check balance on $network"
    }
}

# ===== STEP 7: Deploy =====
if ($DeployTarget -and -not $VerifyOnly) {
    Write-Step "Deploying to $DeployTarget"
    
    if ($DeployTarget -notin @("amoy", "polygon")) {
        Write-Fail "Invalid deploy target '$DeployTarget'. Use 'amoy' or 'polygon'."
        exit 1
    }
    
    if ($DeployTarget -eq "polygon") {
        Write-Warn "DEPLOYING TO POLYGON MAINNET - This costs real POL."
        Write-Host ""
        $confirm = Read-Host "  Type 'yes' to proceed, anything else to abort"
        if ($confirm -ne "yes") {
            Write-Info "Deployment aborted."
            exit 0
        }
    }
    
    if (-not $DryRun) {
        Push-Location $ProjectRoot
        Write-Info "Running: npx hardhat run web3/scripts/deploy.js --network $DeployTarget"
        npx hardhat run web3/scripts/deploy.js --network $DeployTarget
        $deployExitCode = $LASTEXITCODE
        Pop-Location
        
        if ($deployExitCode -ne 0) {
            Write-Fail "Deployment failed (exit code $deployExitCode)"
            exit 1
        }
        Write-OK "Deployment to $DeployTarget complete!"
    } else {
        Write-Info "[DRY RUN] Would run: npx hardhat run web3/scripts/deploy.js --network $DeployTarget"
    }
}

# ===== STEP 8: Verify on Polygonscan =====
if ($VerifyOnly -or ($DeployTarget -eq "polygon")) {
    Write-Step "Verifying contracts on Polygonscan"
    
    if ($envContent -notmatch "(?m)^POLYGONSCAN_API_KEY=.+") {
        Write-Warn "POLYGONSCAN_API_KEY not set in .env - skipping verification"
    } elseif (-not $DryRun) {
        Push-Location $ProjectRoot
        npx hardhat run web3/scripts/verify.js --network polygon
        Pop-Location
        Write-OK "Verification complete"
    } else {
        Write-Info "[DRY RUN] Would run: npx hardhat run web3/scripts/verify.js --network polygon"
    }
}

# ===== Summary =====
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host " Done!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor White
Write-Host ""
Write-Info "What was done:"
Write-Info "  - Environment validated"
Write-Info "  - Contracts compiled"
if (-not $SkipTests) { Write-Info "  - Tests passed" }
if ($DeployTarget) { Write-Info "  - Deployed to $DeployTarget" }
if ($VerifyOnly) { Write-Info "  - Verified on Polygonscan" }
Write-Host ""
Write-Info "Useful commands:"
Write-Info "  .\setup-and-deploy.ps1                          # Compile + test only"
Write-Info "  .\setup-and-deploy.ps1 -DeployTarget amoy       # Deploy to testnet"
Write-Info "  .\setup-and-deploy.ps1 -DeployTarget polygon    # Deploy to mainnet"
Write-Info "  .\setup-and-deploy.ps1 -VerifyOnly              # Verify existing contracts"
Write-Info "  .\setup-and-deploy.ps1 -DryRun                  # Preview without executing"
Write-Info "  .\setup-and-deploy.ps1 -SkipTests -DeployTarget polygon  # Skip tests, deploy"
Write-Host ""
