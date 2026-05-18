"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const msal = __importStar(require("@azure/msal-node"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_FILE = path.join(process.cwd(), '.msal-cache.json');
const cachePlugin = {
    beforeCacheAccess: async (ctx) => {
        if (fs.existsSync(CACHE_FILE)) {
            ctx.tokenCache.deserialize(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
    },
    afterCacheAccess: async (ctx) => {
        if (ctx.cacheHasChanged) {
            fs.writeFileSync(CACHE_FILE, ctx.tokenCache.serialize());
        }
    },
};
let AuthService = class AuthService {
    msalClient;
    constructor() {
        this.msalClient = new msal.ConfidentialClientApplication({
            auth: {
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET,
                authority: `https://login.microsoftonline.com/common`,
            },
            cache: { cachePlugin },
        });
    }
    async getAuthUrl() {
        return this.msalClient.getAuthCodeUrl({
            scopes: ['Mail.Read', 'User.Read', 'offline_access'],
            redirectUri: process.env.MICROSOFT_REDIRECT_URI,
            prompt: 'select_account',
        });
    }
    async exchangeCodeForToken(code) {
        return this.msalClient.acquireTokenByCode({
            code,
            scopes: ['Mail.Read', 'User.Read', 'offline_access'],
            redirectUri: process.env.MICROSOFT_REDIRECT_URI,
        });
    }
    async refreshToken(refreshToken) {
        return this.msalClient.acquireTokenByRefreshToken({
            refreshToken,
            scopes: ['Mail.Read', 'User.Read', 'offline_access'],
        });
    }
    async acquireSilent(userEmail) {
        const accounts = await this.msalClient.getTokenCache().getAllAccounts();
        const account = accounts.find(a => a.username?.toLowerCase() === userEmail.toLowerCase());
        if (!account)
            return null;
        return this.msalClient.acquireTokenSilent({
            account,
            scopes: ['Mail.Read', 'User.Read', 'offline_access'],
            forceRefresh: true,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AuthService);
//# sourceMappingURL=auth.service.js.map