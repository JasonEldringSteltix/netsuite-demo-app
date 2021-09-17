/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types'
import * as log from 'N/log';
import * as runtime from 'N/runtime';
import {record} from "N";
import {load} from "N/record";
import { runSuiteQL } from 'N/query';

/*
* Author: Jason Eldring
* Description: This script will copy records from the temp Recipe table to the production Recipe table.
* V1 : JE: Created a function to copy the records from the temp table to production - 17/09/2021
* */

export function execute(ctx: EntryPoints.Scheduled.executeContext) {
    // Setup the script variable to query our total Governance Points available.
    let script = runtime.getCurrentScript();

    // Create a SuiteQL (SQL) query that will query for records that we can copy to Production
    const queryRecipesNotImported = () => {
        const sql = `SELECT * FROM customrecord_lerp_recipe_manager_staging 
                    WHERE custrecord_lerp_ready_for_import IN ('true', 'T', '1')
                    AND custrecord_lerp_import_completed IN ('false', 'F', '0')`;
        return runSuiteQL({
            query: sql,
            params: []
        }).asMappedResults();
    }

    // Get the results of the SuiteQL query
    // Will return a JSON Array
    let results = queryRecipesNotImported();

    // Log how many points we still have available after the query
    log.debug({
        "title": "Governance Monitoring",
        "details": "Remaining Usage => " + script.getRemainingUsage()
    });

    // Loop through our JSON array of objects, create the new production record and update the fields values.
    results.forEach((eachResult) => {
        // try/catch block to handle errors
        try {
            // Create a new Production record table to populate
            let newRecord = record.create({type: 'customrecord_lerp_recipe_manager_product', isDynamic: true});

            // Update the production table field values with the source records field values.
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_recipe_name',
                value: eachResult.custrecord_lerp_stage_recipe_name
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_recipe_import_no',
                value: eachResult.custrecord_lerp_stage_recipe_import_no
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_recipe_date_listed',
                value: eachResult.custrecord_lerp_stage_recipe_date_listed
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_ingredient_bun',
                value: eachResult.custrecord_lerp_stage_ingredient_bun === 'T' ? true : false
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_ingredient_lettuce',
                value: eachResult.custrecord_lerp_stage_ingredient_lettuce === 'T' ? true : false
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_ingredient_tomato',
                value: eachResult.custrecord_lerp_stage_ingredient_tomato === 'T' ? true : false
            });
            newRecord.setValue({
                fieldId: 'custrecord_lerp_prod_ingredient_sauce',
                value: eachResult.custrecord_lerp_stage_ingredient_sauce
            });

            // try/catch block to handle errors when creating the new record.
            try {
                // Save the new Production record
                newRecord.save();

                // Load our source record and mark our source records checkbox fields that it has been updated
                // so as to prevent future imports of the same record
                let originRecord = load({
                    id: eachResult.id,
                    type: 'customrecord_lerp_recipe_manager_staging',
                    isDynamic: true
                });
                // Set our source records field values with the required values
                originRecord.setValue({fieldId: 'custrecord_lerp_import_completed', value: true});
                originRecord.setValue({fieldId: 'custrecord_lerp_ready_for_import', value: false});
                // Save the source record with the updated fields
                originRecord.save();

                // Log out our governance points to see how many points we have left after updating
                // the object in the array.
                log.debug({
                    "title": "Governance Monitoring",
                    "details": "Remaining Usage after adding new record => " + script.getRemainingUsage()
                });

            } catch (e) {
                // Log that we had an error and what the error was.
                log.debug('Error Failed Import', e)
            }
        //handle our top level try/catch block for errors - This is outside of the object
        } catch (e) {
            // Load the origin record as we save the error message to the record.
            // This will assist the user in knowing what is wrong with the import
            // so that he/she can fix the issue.
            let originRecord = load({
                id: eachResult.id,
                type: 'customrecord_lerp_recipe_manager_staging',
                isDynamic: true
            });
            // Set the error message in the Error Message field on our temporary record.
            originRecord.setValue({fieldId: 'custrecord_lerp_import_error_message', value: e.message});
            // Save the record to save the error message.
            originRecord.save();

            // Log that we had an error to the scripts execution log.
            log.debug('Error Failed Import', e);
        }
    })
}