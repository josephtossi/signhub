"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEnvelopeDto = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var RecipientDto = function () {
    var _a;
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _fullName_decorators;
    var _fullName_initializers = [];
    var _fullName_extraInitializers = [];
    var _role_decorators;
    var _role_initializers = [];
    var _role_extraInitializers = [];
    var _routingOrder_decorators;
    var _routingOrder_initializers = [];
    var _routingOrder_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RecipientDto() {
                this.email = __runInitializers(this, _email_initializers, void 0);
                this.fullName = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _fullName_initializers, void 0));
                this.role = (__runInitializers(this, _fullName_extraInitializers), __runInitializers(this, _role_initializers, void 0));
                this.routingOrder = (__runInitializers(this, _role_extraInitializers), __runInitializers(this, _routingOrder_initializers, void 0));
                __runInitializers(this, _routingOrder_extraInitializers);
            }
            return RecipientDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _email_decorators = [(0, class_validator_1.IsEmail)()];
            _fullName_decorators = [(0, class_validator_1.IsString)()];
            _role_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _routingOrder_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_transformer_1.Type)(function () { return Number; })];
            __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
            __esDecorate(null, null, _fullName_decorators, { kind: "field", name: "fullName", static: false, private: false, access: { has: function (obj) { return "fullName" in obj; }, get: function (obj) { return obj.fullName; }, set: function (obj, value) { obj.fullName = value; } }, metadata: _metadata }, _fullName_initializers, _fullName_extraInitializers);
            __esDecorate(null, null, _role_decorators, { kind: "field", name: "role", static: false, private: false, access: { has: function (obj) { return "role" in obj; }, get: function (obj) { return obj.role; }, set: function (obj, value) { obj.role = value; } }, metadata: _metadata }, _role_initializers, _role_extraInitializers);
            __esDecorate(null, null, _routingOrder_decorators, { kind: "field", name: "routingOrder", static: false, private: false, access: { has: function (obj) { return "routingOrder" in obj; }, get: function (obj) { return obj.routingOrder; }, set: function (obj, value) { obj.routingOrder = value; } }, metadata: _metadata }, _routingOrder_initializers, _routingOrder_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var CreateEnvelopeDto = function () {
    var _a;
    var _organizationId_decorators;
    var _organizationId_initializers = [];
    var _organizationId_extraInitializers = [];
    var _documentId_decorators;
    var _documentId_initializers = [];
    var _documentId_extraInitializers = [];
    var _subject_decorators;
    var _subject_initializers = [];
    var _subject_extraInitializers = [];
    var _message_decorators;
    var _message_initializers = [];
    var _message_extraInitializers = [];
    var _signingOrder_decorators;
    var _signingOrder_initializers = [];
    var _signingOrder_extraInitializers = [];
    var _recipients_decorators;
    var _recipients_initializers = [];
    var _recipients_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateEnvelopeDto() {
                this.organizationId = __runInitializers(this, _organizationId_initializers, void 0);
                this.documentId = (__runInitializers(this, _organizationId_extraInitializers), __runInitializers(this, _documentId_initializers, void 0));
                this.subject = (__runInitializers(this, _documentId_extraInitializers), __runInitializers(this, _subject_initializers, void 0));
                this.message = (__runInitializers(this, _subject_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                this.signingOrder = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _signingOrder_initializers, void 0));
                this.recipients = (__runInitializers(this, _signingOrder_extraInitializers), __runInitializers(this, _recipients_initializers, void 0));
                __runInitializers(this, _recipients_extraInitializers);
            }
            return CreateEnvelopeDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _organizationId_decorators = [(0, class_validator_1.IsString)()];
            _documentId_decorators = [(0, class_validator_1.IsString)()];
            _subject_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _message_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _signingOrder_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _recipients_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return RecipientDto; })];
            __esDecorate(null, null, _organizationId_decorators, { kind: "field", name: "organizationId", static: false, private: false, access: { has: function (obj) { return "organizationId" in obj; }, get: function (obj) { return obj.organizationId; }, set: function (obj, value) { obj.organizationId = value; } }, metadata: _metadata }, _organizationId_initializers, _organizationId_extraInitializers);
            __esDecorate(null, null, _documentId_decorators, { kind: "field", name: "documentId", static: false, private: false, access: { has: function (obj) { return "documentId" in obj; }, get: function (obj) { return obj.documentId; }, set: function (obj, value) { obj.documentId = value; } }, metadata: _metadata }, _documentId_initializers, _documentId_extraInitializers);
            __esDecorate(null, null, _subject_decorators, { kind: "field", name: "subject", static: false, private: false, access: { has: function (obj) { return "subject" in obj; }, get: function (obj) { return obj.subject; }, set: function (obj, value) { obj.subject = value; } }, metadata: _metadata }, _subject_initializers, _subject_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: function (obj) { return "message" in obj; }, get: function (obj) { return obj.message; }, set: function (obj, value) { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            __esDecorate(null, null, _signingOrder_decorators, { kind: "field", name: "signingOrder", static: false, private: false, access: { has: function (obj) { return "signingOrder" in obj; }, get: function (obj) { return obj.signingOrder; }, set: function (obj, value) { obj.signingOrder = value; } }, metadata: _metadata }, _signingOrder_initializers, _signingOrder_extraInitializers);
            __esDecorate(null, null, _recipients_decorators, { kind: "field", name: "recipients", static: false, private: false, access: { has: function (obj) { return "recipients" in obj; }, get: function (obj) { return obj.recipients; }, set: function (obj, value) { obj.recipients = value; } }, metadata: _metadata }, _recipients_initializers, _recipients_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateEnvelopeDto = CreateEnvelopeDto;
