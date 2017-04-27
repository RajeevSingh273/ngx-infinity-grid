import {
	ViewEncapsulation,
	Component,
	Input
} from "@angular/core";

import {InfinityDataSource} from "./infinity-data-source";

@Component({
	selector: 'InfinityGrid',
	template: `
			<div style="display: table-row;">
				<div class="infinity-grid-header">
					<div class="infinity-grid-header-cell">
						COLUMN1
					</div>
				</div>
			</div>
			<div style="display: table-row; height: 100%;">
				<div style="position: relative; width: 100%; height: 100%;">
					<div style="position: absolute; width: 100%; height: 100%;">
						<InfinityTable [dataSource]="dataSource">
						</InfinityTable>
					</div>
				</div>
			</div>
		`,
	styleUrls: [
		'./infinity-grid.component.css'
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityGrid {

	@Input() dataSource: InfinityDataSource<any>;
}
