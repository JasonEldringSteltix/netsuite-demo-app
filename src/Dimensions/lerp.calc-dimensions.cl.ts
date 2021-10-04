/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';
import {DimensionsTypes} from "./lerp.dimensions.types";
import {runSuiteQL} from "N/query";
import { create, Type as MessageType, Message } from 'N/ui/message'
import * as dialog from 'N/ui/dialog';
import {record} from "N";

/*
* Author: Jason Eldring
* Description: This script will calculate the weights entered on the Sales Order to determine the Shipment Weight, Dim Weight
* and the then use the highest value of the two weights for the Chargeable weight.
* V1 : JE: Created the client scripts to calculate and update the Sales Order Record. - 27/09/2021
* */

export function pageInit(ctx: EntryPoints.Client.pageInitContext) {
    // @ts-ignore
    if (ctx.currentRecord.isNew) {
        // Hide the fields if the Sales Order is new and has not been saved.
        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemQuantity}) ?
            ctx.currentRecord.getField({fieldId: DimensionsTypes.itemQuantity}).isDisplay = false
        : null;

        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemWeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.itemWeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemLength}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.itemLength}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemWidth}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.itemWidth}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemHeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.itemHeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.itemHeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.itemHeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForCustomer}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForCustomer}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.dimensionType}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.dimensionType}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.shipmentWeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.shipmentWeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.dimWeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.dimWeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.chargeWeight}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.chargeWeight}).isDisplay = false : null;
        ctx.currentRecord.getField({fieldId: DimensionsTypes.summaryRecordLink}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.summaryRecordLink}).isDisplay = false : null;
    } else {
        ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}) ? ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}).isDisplay = false : null;
    }
}


export function fieldChanged(ctx: EntryPoints.Client.fieldChangedContext) {
    // @ts-ignore
    if (!ctx.currentRecord.isNew && (
        ctx.fieldId === DimensionsTypes.itemQuantity ||
        ctx.fieldId === DimensionsTypes.itemWeight ||
        ctx.fieldId === DimensionsTypes.itemLength ||
        ctx.fieldId === DimensionsTypes.itemWidth ||
        ctx.fieldId === DimensionsTypes.itemHeight ||
        ctx.fieldId === DimensionsTypes.itemHeight ||
        ctx.fieldId === DimensionsTypes.dimensionType
    )) {
        let shipmentWeight = 0;
        let dimWeight = 0;
        let chargeableWeight = 0;

        let quantity = ctx.currentRecord.getValue(DimensionsTypes.itemQuantity) as number;
        let weight = ctx.currentRecord.getValue(DimensionsTypes.itemWeight) as number;
        let length = ctx.currentRecord.getValue(DimensionsTypes.itemLength) as number;
        let width = ctx.currentRecord.getValue(DimensionsTypes.itemWidth) as number;
        let height = ctx.currentRecord.getValue(DimensionsTypes.itemHeight) as number;
        let dimensionType = ctx.currentRecord.getValue(DimensionsTypes.dimensionType) as number;


        if (quantity > 0 && weight > 0) {
            shipmentWeight = quantity * weight
        }

        if (quantity > 0 && length > 0 && width > 0 && height > 0 && dimensionType) {
            // Get the dimension type value.
            const queryDimensionTypeValue = () => {
                const sql = `SELECT custrecord_lerp_dt_value FROM customrecord_lerp_dimension_types 
                    WHERE id = ${dimensionType}`;
                return runSuiteQL({
                    query: sql,
                    params: []
                }).asMappedResults();
            }
            let dimensionTypeValue = queryDimensionTypeValue();

            dimWeight = (quantity * length * width * height) / (dimensionTypeValue[0].custrecord_lerp_dt_value as number)
        }

        if (shipmentWeight > 0 && dimWeight > 0) {
            ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}).isDisplay = true;
            if (shipmentWeight > dimWeight) {
                chargeableWeight = shipmentWeight;
            } else {
                chargeableWeight = dimWeight
            }
        } else {
            ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}).isDisplay = false;
        }

        ctx.currentRecord.setValue({
            fieldId: DimensionsTypes.shipmentWeight,
            value: shipmentWeight
        })
        ctx.currentRecord.setValue({
            fieldId: DimensionsTypes.dimWeight,
            value: dimWeight
        })
        ctx.currentRecord.setValue({
            fieldId: DimensionsTypes.chargeWeight,
            value: chargeableWeight
        })
    }

    //Update the Dimensions Detail Record
    // @ts-ignore
    if (!ctx.currentRecord.isNew && ctx.fieldId === DimensionsTypes.readyForSummaryProces) {
        if (ctx.currentRecord.getValue(DimensionsTypes.chargeWeight) > 0) {
            let summaryRecordLink = ctx.currentRecord.getValue(DimensionsTypes.summaryRecordLink) as number;
            let dimensionType = ctx.currentRecord.getValue(DimensionsTypes.dimensionType) as number;
            let chargeWeight = ctx.currentRecord.getValue(DimensionsTypes.chargeWeight) as number;
            let soId = ctx.currentRecord.getValue('id') as number;

            //Create New Dimension Detail Record
            let dimensionRecord = record.create({type: 'customrecord_lerp_dimension_detail_recor', isDynamic: true});
            dimensionRecord.setValue({fieldId: 'custrecord_lerp_dimension_summary_parent', value: summaryRecordLink});
            dimensionRecord.setValue({fieldId: 'custrecord_lerp_dimension_type', value: dimensionType});
            dimensionRecord.setValue({fieldId: 'custrecord_lerp_actual_weight', value: chargeWeight});
            dimensionRecord.setValue({fieldId: 'custrecord_lerp_dr_sales_order_parent', value: soId});

            dimensionRecord.save()

            // Reset the fields back to empty to allow the user to enter another set of fields.
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemQuantity, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemWeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemLength, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemWidth, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemHeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.itemHeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.readyForSummaryProces, value: false, ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.readyForCustomer, value: false, ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.dimensionType, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.shipmentWeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.dimWeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.chargeWeight, value: '', ignoreFieldChange: true})
            ctx.currentRecord.setValue({fieldId: DimensionsTypes.chargeWeight, value: '', ignoreFieldChange: true})
            // Hide the "Ready for Summary" checkbox
            ctx.currentRecord.getField({fieldId: DimensionsTypes.readyForSummaryProces}).isDisplay = false;

            let successMsg = `The Dimensions Details Record has been created.`;
            let msg = create({
                type: MessageType.CONFIRMATION,
                duration: 5000,
                message: successMsg,
                title: 'SUCCESS'
            });
            msg.show();

        } else {
            ctx.currentRecord.setValue({
                fieldId: DimensionsTypes.readyForSummaryProces,
                value: false
            })

            let options = {
                title: 'ERROR',
                message: 'Please enter all field values before creating the Dimensions Summary Record.  Chargeable Weight must be greater than zero'
            };

            dialog.alert(options);
        }
    }
}