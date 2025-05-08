"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmcdEncoding = void 0;
const CMCD_HEADERS_1 = require("./CMCD_HEADERS");
const CMCD_JSON_1 = require("./CMCD_JSON");
const CMCD_QUERY_1 = require("./CMCD_QUERY");
/**
 * CMCD encoding types.
 *
 * @group CMCD
 *
 * @enum
 *
 * @beta
 */
exports.CmcdEncoding = {
    /**
     * JSON
     */
    JSON: CMCD_JSON_1.CMCD_JSON,
    /**
     * Query string
     */
    QUERY: CMCD_QUERY_1.CMCD_QUERY,
    /**
     * Request headers
     */
    HEADERS: CMCD_HEADERS_1.CMCD_HEADERS,
};
//# sourceMappingURL=CmcdEncoding.js.map