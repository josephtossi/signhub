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
exports.SubmitSignatureDto = void 0;
var class_validator_1 = require("class-validator");
var SignatureKind;
(function (SignatureKind) {
    SignatureKind["DRAW"] = "DRAW";
    SignatureKind["TYPE"] = "TYPE";
    SignatureKind["UPLOAD"] = "UPLOAD";
})(SignatureKind || (SignatureKind = {}));
var SubmitSignatureDto = function () {
    var _a;
    var _fieldId_decorators;
    var _fieldId_initializers = [];
    var _fieldId_extraInitializers = [];
    var _signatureType_decorators;
    var _signatureType_initializers = [];
    var _signatureType_extraInitializers = [];
    var _imageBase64_decorators;
    var _imageBase64_initializers = [];
    var _imageBase64_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SubmitSignatureDto() {
                this.fieldId = __runInitializers(this, _fieldId_initializers, void 0);
                this.signatureType = (__runInitializers(this, _fieldId_extraInitializers), __runInitializers(this, _signatureType_initializers, void 0));
                this.imageBase64 = (__runInitializers(this, _signatureType_extraInitializers), __runInitializers(this, _imageBase64_initializers, void 0));
                __runInitializers(this, _imageBase64_extraInitializers);
            }
            return SubmitSignatureDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _fieldId_decorators = [(0, class_validator_1.IsString)()];
            _signatureType_decorators = [(0, class_validator_1.IsEnum)(SignatureKind)];
            _imageBase64_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _fieldId_decorators, { kind: "field", name: "fieldId", static: false, private: false, access: { has: function (obj) { return "fieldId" in obj; }, get: function (obj) { return obj.fieldId; }, set: function (obj, value) { obj.fieldId = value; } }, metadata: _metadata }, _fieldId_initializers, _fieldId_extraInitializers);
            __esDecorate(null, null, _signatureType_decorators, { kind: "field", name: "signatureType", static: false, private: false, access: { has: function (obj) { return "signatureType" in obj; }, get: function (obj) { return obj.signatureType; }, set: function (obj, value) { obj.signatureType = value; } }, metadata: _metadata }, _signatureType_initializers, _signatureType_extraInitializers);
            __esDecorate(null, null, _imageBase64_decorators, { kind: "field", name: "imageBase64", static: false, private: false, access: { has: function (obj) { return "imageBase64" in obj; }, get: function (obj) { return obj.imageBase64; }, set: function (obj, value) { obj.imageBase64 = value; } }, metadata: _metadata }, _imageBase64_initializers, _imageBase64_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SubmitSignatureDto = SubmitSignatureDto;
