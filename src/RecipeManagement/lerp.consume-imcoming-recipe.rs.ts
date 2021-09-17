/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

/*
* Author: Jason Eldring
* Description: This script will receive data from an external server that will create new recipe records.
* V1 : JE: Created a POST function - 17/09/2021
* V2 : JE: Created a GET function using SuiteQL (SQL) - 17/09/2021
* */

import * as log from 'N/log';
import {IRestPostInput, IRestPostInputDetailed} from "./lerp.recipe.types";
import * as runtime from 'N/runtime';
import {record} from "N";
import {create as createSearch, createColumn, Operator} from "N/search";
import {load} from "N/record";
import {runSuiteQL} from "N/query";

/*
* Handle the POST from the server that is updating NetSuite
* */
export function post(ctx: IRestPostInputDetailed[]) {
    // Setup the script variable to query our total Governance Points available.
    let script = runtime.getCurrentScript();
    // Response return to the source server
    let importRecipeResponse: any = [];

    // Loop through the array from the POST and create new records.
    ctx.forEach(function(item: any) {
        // Create a new record
        let newRecord = record.create({type: 'customrecord_lerp_recipe_manager_staging', isDynamic: true});
        // Update the field values from the object
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_recipe_name', value: item.recipeName});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_recipe_import_no', value: item.recipeId});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_recipe_date_listed', value: item.dateCreated});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_ingredient_bun', value: item.bun});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_ingredient_lettuce', value: item.lettuce});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_ingredient_tomato', value: item.tomato});
        newRecord.setValue({fieldId: 'custrecord_lerp_stage_ingredient_sauce', value: item.sauce});
        // Set our flags for the script that copies this from the staging table record to the production table record
        newRecord.setValue({fieldId: 'custrecord_lerp_ready_for_import', value: true});
        newRecord.setValue({fieldId: 'custrecord_lerp_import_completed', value: false});

        // Save the record
        newRecord.save();
        // Logout the remaining Governance points availble to us after the loop
        log.debug({
            "title": "Governance Monitoring",
            "details": "Remaining Usage => " + script.getRemainingUsage()
        });

        // update that the record was successfully created.
        // This will push a new array to the response object
        importRecipeResponse.push({id: item.recipeId, status: 'Success'})
    })

    // After our records have been created
    log.debug({
        "title": "Governance Monitoring",
        "details": "Total Remaining Usage => " + script.getRemainingUsage()
    });

    // return the response Array of successful objects
    return importRecipeResponse
}

/*
* Handle a GET function that will return all records from our temporary table using SuiteQL
* The response will be JSON
* */
export function get(ctx: IRestPostInput[]) {
    // Create a function that will query all records from the temporary Recipe table.
    const getTempTableRecipes = () => {

        // Define our SuiteQL query statement
        let values = `*`;
        const sql = `SELECT ${values}
                     FROM customrecord_lerp_recipe_manager_staging`;
        // Execute the Query from the SuiteQL service that we imported
        // asMappedResults will return it in JSON
        return runSuiteQL({
            query: sql,
            params: []
        }).asMappedResults();
    }

    // Return the JSON from the SQL query above
    return getTempTableRecipes();

}