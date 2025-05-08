import type { ValueOf } from '../utils/ValueOf';
import { CMCD_HEADERS } from './CMCD_HEADERS';
import { CMCD_JSON } from './CMCD_JSON';
import { CMCD_QUERY } from './CMCD_QUERY';
/**
 * CMCD encoding types.
 *
 * @group CMCD
 *
 * @enum
 *
 * @beta
 */
export declare const CmcdEncoding: {
    /**
     * JSON
     */
    readonly JSON: typeof CMCD_JSON;
    /**
     * Query string
     */
    readonly QUERY: typeof CMCD_QUERY;
    /**
     * Request headers
     */
    readonly HEADERS: typeof CMCD_HEADERS;
};
/**
 * @beta
 */
export type CmcdEncoding = ValueOf<typeof CmcdEncoding>;
//# sourceMappingURL=CmcdEncoding.d.ts.map