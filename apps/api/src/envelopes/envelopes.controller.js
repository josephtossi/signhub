"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvelopesController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
var EnvelopesController = function () {
    var _classDecorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Controller)("envelopes")];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _create_decorators;
    var _send_decorators;
    var _status_decorators;
    var _listFields_decorators;
    var _saveFields_decorators;
    var EnvelopesController = _classThis = /** @class */ (function () {
        function EnvelopesController_1(envelopesService) {
            this.envelopesService = (__runInitializers(this, _instanceExtraInitializers), envelopesService);
        }
        EnvelopesController_1.prototype.create = function (dto) {
            return this.envelopesService.create(dto);
        };
        EnvelopesController_1.prototype.send = function (id) {
            return this.envelopesService.send(id);
        };
        EnvelopesController_1.prototype.status = function (id) {
            return this.envelopesService.status(id);
        };
        EnvelopesController_1.prototype.listFields = function (id) {
            return this.envelopesService.listFields(id);
        };
        EnvelopesController_1.prototype.saveFields = function (id, dto) {
            return this.envelopesService.saveFields(id, dto);
        };
        return EnvelopesController_1;
    }());
    __setFunctionName(_classThis, "EnvelopesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)()];
        _send_decorators = [(0, common_1.Post)(":id/send")];
        _status_decorators = [(0, common_1.Get)(":id/status")];
        _listFields_decorators = [(0, common_1.Get)(":id/fields")];
        _saveFields_decorators = [(0, common_1.Post)(":id/fields")];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _send_decorators, { kind: "method", name: "send", static: false, private: false, access: { has: function (obj) { return "send" in obj; }, get: function (obj) { return obj.send; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listFields_decorators, { kind: "method", name: "listFields", static: false, private: false, access: { has: function (obj) { return "listFields" in obj; }, get: function (obj) { return obj.listFields; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveFields_decorators, { kind: "method", name: "saveFields", static: false, private: false, access: { has: function (obj) { return "saveFields" in obj; }, get: function (obj) { return obj.saveFields; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EnvelopesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EnvelopesController = _classThis;
}();
exports.EnvelopesController = EnvelopesController;
