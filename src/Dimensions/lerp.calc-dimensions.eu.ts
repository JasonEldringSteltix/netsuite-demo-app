/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
*/

/*
* Author: Jason Eldring
* Description: This script will create the Dimensions Summary record when the SalesOrder is 'created'/saved for the first time.
* V1 : JE: Created the User Event script to create Dimensions Summary record. - 27/09/2021
*/

import { EntryPoints } from 'N/types';
import {record} from "N";
import * as log from 'N/log';
import {load} from "N/record";

export function afterSubmit(ctx: EntryPoints.UserEvent.afterSubmitContext) {

    let newRecordId;
    // Create the Dimensions Summary Record
    let dimensionRecord = record.create({type: 'customrecord_lerp_dimensions_summary_rec', isDynamic: true});
    dimensionRecord.setValue({fieldId: 'custrecord_lerp_sales_order_parent_link', value: ctx.newRecord.id});

    try {
        newRecordId = dimensionRecord.save()

        // Update the Sales Order with the Dimensions Summary Record ID
        let updateRecord = load({
            id: ctx.newRecord.id,
            type: 'salesorder',
            isDynamic: true
        });
        updateRecord.setValue({fieldId: 'custbody_lerp_dimension_summary_r_link', value: newRecordId})
        updateRecord.save();

    } catch (e) {
        log.debug('ERROR', e)
    }
}