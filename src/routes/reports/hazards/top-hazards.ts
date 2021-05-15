import { HierarchyFilter } from "./compliance-by-category";

const TOP_COUNT = 10;

export const getTop10Hazards = (categories, hazards, filter: HierarchyFilter): {id: string, name: string, value: number}[] => {
    let topData = [];
    if(filter.hazardType == 'TOP') {
        categories.forEach((category) => {
            category.elements.forEach((element) => {
                let nonCompliantCount = 0;
                hazards.forEach((hazard) => {
                    //console.log("hazard", hazard);
                    let isNonCompliant = hazard.element_compliance[element.id] && hazard.element_compliance[element.id]['N'];

                    if(isNonCompliant) {
                        nonCompliantCount++;
                    }
                });
                if(nonCompliantCount > 0) {
                    topData.push({
                    id: element.id,
                    name: element.name,
                    value: nonCompliantCount
                    });
                }
            });
        });
        console.log("top", topData);
        topData = topData.sort((obj1, obj2) => {
            let diff = obj2.value - obj1.value;
            if(diff == 0) {
                return obj1.name.localeCompare(obj2.name);
            } else {
                return diff;
            }
        }).slice(0, TOP_COUNT);
        //console.log("filtered", topData);
    }

    return topData;
}