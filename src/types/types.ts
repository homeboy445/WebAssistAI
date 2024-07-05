export type GenericObject = { [props: string]: unknown };

export enum TaskType {
  DOM_OPERATION = "DOM_OPERATION",
  INFO_RETRIEVAL = "INFO_RETRIEVAL",
}

export interface AITaskResponse {
  result: GenericObject | string ;
  additionalInfo?: string;
  operationSuccess: boolean;
  functionType?: TaskType;
}
