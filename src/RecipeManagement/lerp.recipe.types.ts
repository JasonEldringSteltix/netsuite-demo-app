
export interface IRestPostBody {
    start: number
    end: number
    id: string
}

export interface IRestPostInputDetailed {
    recipeId: number,
    recipeName: string,
    dateCreated: string,
    bun: boolean,
    lettuce: boolean
    tomato: boolean,
    sauce: string
}

export interface IRestPostInput {
    [key:string]: IRestPostInputDetailed,
}