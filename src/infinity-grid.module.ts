import {
	ModuleWithProviders,
	NgModule
} from "@angular/core";

import {CommonModule} from "@angular/common";

import {InfinityGrid} from "./infinity-grid.component";
import {InfinityTable} from "./infinity-table.component";
import {
	InfinityDataSourceFactory,
	DefaultInfinityDataSourceFactory
} from "./infinity-data-source.service";
import {INFINITY_GRID_DEBUG_ENABLED, InfinityGridSettings} from "./infinity-grid.settings";

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

	static forRoot(config?: InfinityGridSettings): ModuleWithProviders {
		const localConfig: InfinityGridSettings = {
			debugEnabled: config ? config.debugEnabled : true
		};

		return {
			ngModule: InfinityGridModule,
			providers: [
				{provide: INFINITY_GRID_DEBUG_ENABLED, useValue: localConfig.debugEnabled},
				{provide: InfinityDataSourceFactory, useClass: DefaultInfinityDataSourceFactory}
			]
		};
	}
}
