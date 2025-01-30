"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var Executor = /** @class */ (function () {
    function Executor() {
        this.startedAt = BigInt(0);
        this.prevPerformanceRecordedAt = BigInt(0);
        this.executeData = {
            running: {},
            completed: {},
            performanceData: []
        };
        this.performanceReport = {
            min: 0,
            max: 0,
            avg: 0
        };
    }
    Executor.prototype.start = function () {
        var _this = this;
        this.executeData.running = {};
        this.executeData.completed = {};
        this.executeData.performanceData.length = 0;
        this.performanceReport.min = 0;
        this.performanceReport.max = 0;
        this.performanceReport.avg = 0;
        var now = process.hrtime.bigint();
        this.startedAt = now;
        this.prevPerformanceRecordedAt = now;
        this.recordPerformanceInterval = setInterval(function () { return _this.recordPerformance(true); }, 10);
    };
    Executor.prototype.stop = function () {
        // istanbul ignore if
        if (this.recordPerformanceInterval) {
            clearInterval(this.recordPerformanceInterval);
            this.recordPerformanceInterval = undefined;
        }
        var totalTime = Number(process.hrtime.bigint() - this.startedAt);
        this.performanceReport.min =
            this.executeData.performanceData
                .filter(function (record) { return !record.excludeFromMin; })
                .reduce(function (min, record) {
                if (record.running.length < min) {
                    return record.running.length;
                }
                return min;
            }, Number.MAX_SAFE_INTEGER);
        this.performanceReport.max =
            this.executeData.performanceData.reduce(function (max, record) {
                if (record.running.length > max) {
                    return record.running.length;
                }
                return max;
            }, 0);
        this.performanceReport.avg =
            this.executeData.performanceData.reduce(function (avg, record) {
                return avg + record.running.length * record.time / totalTime;
            }, 0);
    };
    Executor.prototype.executeTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var running, completed, targetId, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        running = this.executeData.running;
                        completed = this.executeData.completed;
                        targetId = task.targetId;
                        if (running[targetId]) {
                            throw new Error("cannot execute task ".concat(targetId, ":") +
                                "".concat(task.action, ": task with the same targetId=").concat(targetId, " is running"));
                        }
                        this.recordPerformance(true);
                        running[targetId] = task;
                        if (task._onExecute) {
                            task._onExecute();
                        }
                        this.recordPerformance(true);
                        _a = task.action;
                        switch (_a) {
                            case 'init': return [3 /*break*/, 1];
                            case 'prepare': return [3 /*break*/, 4];
                            case 'work': return [3 /*break*/, 7];
                            case 'finalize': return [3 /*break*/, 10];
                        }
                        return [3 /*break*/, 13];
                    case 1: return [4 /*yield*/, sleep(10 * (1 + targetId / 10))];
                    case 2:
                        _b.sent();
                        this.recordPerformance(false);
                        return [4 /*yield*/, sleep(30 * (1 + targetId / 10))];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 4: return [4 /*yield*/, sleep(30 * (1 + targetId / 10))];
                    case 5:
                        _b.sent();
                        this.recordPerformance(false);
                        return [4 /*yield*/, sleep(70 * (1 + targetId / 10))];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 7: return [4 /*yield*/, sleep(50 * (1 + targetId / 10))];
                    case 8:
                        _b.sent();
                        this.recordPerformance(false);
                        return [4 /*yield*/, sleep(150 * (1 + targetId / 10))];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 10: return [4 /*yield*/, sleep(30 * (1 + targetId / 10))];
                    case 11:
                        _b.sent();
                        this.recordPerformance(false);
                        return [4 /*yield*/, sleep(70 * (1 + targetId / 10))];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 13: return [4 /*yield*/, sleep(25)];
                    case 14:
                        _b.sent();
                        this.recordPerformance(false);
                        return [4 /*yield*/, sleep(25)];
                    case 15:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 16:
                        this.recordPerformance(true);
                        delete running[targetId];
                        if (task._onComplete) {
                            task._onComplete();
                        }
                        this.recordPerformance(true);
                        if (!completed[targetId]) {
                            completed[targetId] = [];
                        }
                        completed[targetId].push({ targetId: task.targetId, action: task.action });
                        this.recordPerformance(true);
                        return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.recordPerformance = function (excludeFromMin) {
        var now = process.hrtime.bigint();
        var time = Number(now - this.prevPerformanceRecordedAt);
        this.prevPerformanceRecordedAt = now;
        this.executeData.performanceData.push({
            excludeFromMin: excludeFromMin,
            running: Object.values(this.executeData.running),
            time: time
        });
    };
    return Executor;
}());
exports.default = Executor;
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            ms = Math.max(0, ms);
            // ms += (Math.random() - 0.5) * ms / 10;
            return [2 /*return*/, new Promise(function (r) { return setTimeout(function () { return r(); }, ms); })];
        });
    });
}
