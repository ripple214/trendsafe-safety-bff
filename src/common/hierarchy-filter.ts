import { getDepartments, getSites } from "../routes/hierarchies.router";
import { isWithin } from "./date-util";

export const getHierarchyFilter = (req, onSuccess: (filter: HierarchyFilter) => void, onError?: (error: any) => void): void => {
    let divisionId = req.query.divisionId;
    let projectId = req.query.projectId;
    let siteId = req.query.siteId;
    let subsiteId = req.query.subsiteId;
    let departmentId = req.query.departmentId;
  
    let filters: string[] = [];
    if(departmentId) {
      filters.push(departmentId);
      onSuccess({
        filterType: FilterType.DEPARTMENTS,
        filters: filters
      });
    } else if(subsiteId) {
      getDepartments(req, 
        (data) => {
          onSuccess({
            filterType: FilterType.DEPARTMENTS,
            filters: mapHierarchy(data)
          });
        }, 
        (err) => {
          onError(err);
        }
      );
    } else if(siteId) {
      filters.push(siteId);
      onSuccess({
        filterType: FilterType.SITES,
        filters: filters
      });
    } else if(projectId) {
      getSites(req, 
        (data) => {
          onSuccess({
            filterType: FilterType.SITES,
            filters: mapHierarchy(data)
          });
        }, 
        (err) => {
          onError(err);
        }
      );
    } else if(divisionId) {
      getSites(req, 
        (data) => {
          onSuccess({
            filterType: FilterType.SITES,
            filters: mapHierarchy(data)
          });
        }, 
        (err) => {
          onError(err);
        }
      );
    } else {
      onSuccess({
        filterType: FilterType.NONE,
        filters: []
      });
    }
}
  
const mapHierarchy = (data: any) => {
    let filters = data.map(hierarchy => {
      return hierarchy.id
    })
  
    return filters;
}
 
export interface HierarchyFilter {

    filterType: FilterType;
    filters: string[];
    startDate?: any;
    endDate?: any;
}

export enum FilterType {
    NONE,
    SITES,
    DEPARTMENTS
}

export const isWithinBasicFilter = (entity: {
    completed_date: string,
    site_id: string, 
    department_id, string
}, filter: HierarchyFilter) => {
    
    let isWithinDateRange = isWithin(entity.completed_date, filter.startDate, filter.endDate);
    
    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(entity.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(entity.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    return isWithinHierarchy;
}