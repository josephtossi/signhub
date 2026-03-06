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
exports.SaveFieldsDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var FieldKind;
(function (FieldKind) {
    FieldKind["SIGNATURE"] = "SIGNATURE";
})(FieldKind || (FieldKind = {}));
var FieldCoordinateDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _page_decorators;
    var _page_initializers = [];
    var _page_extraInitializers = [];
    var _x_decorators;
    var _x_initializers = [];
    var _x_extraInitializers = [];
    var _y_decorators;
    var _y_initializers = [];
    var _y_extraInitializers = [];
    var _width_decorators;
    var _width_initializers = [];
    var _width_extraInitializers = [];
    var _height_decorators;
    var _height_initializers = [];
    var _height_extraInitializers = [];
    var _recipientId_decorators;
    var _recipientId_initializers = [];
    var _recipientId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function FieldCoordinateDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.page = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _page_initializers, void 0));
                this.x = (__runInitializers(this, _page_extraInitializers), __runInitializers(this, _x_initializers, void 0));
                this.y = (__runInitializers(this, _x_extraInitializers), __runInitializers(this, _y_initializers, void 0));
                this.width = (__runInitializers(this, _y_extraInitializers), __runInitializers(this, _width_initializers, void 0));
                this.height = (__runInitializers(this, _width_extraInitializers), __runInitializers(this, _height_initializers, void 0));
                this.recipientId = (__runInitializers(this, _height_extraInitializers), __runInitializers(this, _recipientId_initializers, void 0));
                __runInitializers(this, _recipientId_extraInitializers);
            }
            return FieldCoordinateDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsEnum)(FieldKind)];
            _page_decorators = [(0, class_validator_1.IsInt)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _x_decorators = [(0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _y_decorators = [(0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _width_decorators = [(0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _height_decorators = [(0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _recipientId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _page_decorators, { kind: "field", name: "page", static: false, private: false, access: { has: function (obj) { return "page" in obj; }, get: function (obj) { return obj.page; }, set: function (obj, value) { obj.page = value; } }, metadata: _metadata }, _page_initializers, _page_extraInitializers);
            __esDecorate(null, null, _x_decorators, { kind: "field", name: "x", static: false, private: false, access: { has: function (obj) { return "x" in obj; }, get: function (obj) { return obj.x; }, set: function (obj, value) { obj.x = value; } }, metadata: _metadata }, _x_initializers, _x_extraInitializers);
            __esDecorate(null, null, _y_decorators, { kind: "field", name: "y", static: false, private: false, access: { has: function (obj) { return "y" in obj; }, get: function (obj) { return obj.y; }, set: function (obj, value) { obj.y = value; } }, metadata: _metadata }, _y_initializers, _y_extraInitializers);
            __esDecorate(null, null, _width_decorators, { kind: "field", name: "width", static: false, private: false, access: { has: function (obj) { return "width" in obj; }, get: function (obj) { return obj.width; }, set: function (obj, value) { obj.width = value; } }, metadata: _metadata }, _width_initializers, _width_extraInitializers);
            __esDecorate(null, null, _height_decorators, { kind: "field", name: "height", static: false, private: false, access: { has: function (obj) { return "height" in obj; }, get: function (obj) { return obj.height; }, set: function (obj, value) { obj.height = value; } }, metadata: _metadata }, _height_initializers, _height_extraInitializers);
            __esDecorate(null, null, _recipientId_decorators, { kind: "field", name: "recipientId", static: false, private: false, access: { has: function (obj) { return "recipientId" in obj; }, get: function (obj) { return obj.recipientId; }, set: function (obj, value) { obj.recipientId = value; } }, metadata: _metadata }, _recipientId_initializers, _recipientId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var SaveFieldsDto = function () {
    var _a;
    var _fields_decorators;
    var _fields_initializers = [];
    var _fields_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SaveFieldsDto() {
                this.fields = __runInitializers(this, _fields_initializers, void 0);
                __runInitializers(this, _fields_extraInitializers);
            }
            return SaveFieldsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _fields_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return FieldCoordinateDto; })];
            __esDecorate(null, null, _fields_decorators, { kind: "field", name: "fields", static: false, private: false, access: { has: function (obj) { return "fields" in obj; }, get: function (obj) { return obj.fields; }, set: function (obj, value) { obj.fields = value; } }, metadata: _metadata }, _fields_initializers, _fields_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SaveFieldsDto = SaveFieldsDto;
