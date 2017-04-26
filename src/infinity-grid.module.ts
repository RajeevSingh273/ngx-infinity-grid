import {
	ModuleWithProviders,
	NgModule
} from "@angular/core";

import {CommonModule} from "@angular/common";

import {InfinityGrid} from "./infinity-grid.component";
import {InfinityTable} from "./infinity-table.component";

@NgModule({
	imports: [
		CommonModule
	],
	declarations: [
		InfinityTable,
		InfinityGrid
	],
	exports: [
		InfinityTable,
		InfinityGrid
	]
})
export class InfinityGridModule {

	static forRoot(): ModuleWithProviders {
		return {
			ngModule: InfinityGridModule
		};
	}
}
