

export interface Entity {
    id: string;
    name: string;
    parents?: string[];
    parentNames?: string[]
    division_id: string;
    project_id: string;
    site_id: string;
    subsite_id: string;
    department_id: string;
}