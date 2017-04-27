import {
	ViewEncapsulation,
	Component,
	Input
} from "@angular/core";

import {InfinityDataSource} from "./infinity-data-source.service";

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
	styles: [
		`
		infinitygrid {
		    display: table;
		    height: 100%;
		    width: 100%;
		    border: 1px solid #808080;
		    cursor: default;
		}
		
		.infinity-grid-header {
		    background: linear-gradient(#fff, #d3d3d3);
		}
		
		.infinity-grid-header-cell {
		    padding: 8px;
		    display: inline-block;
		}
		`
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityGrid {

	@Input() dataSource: InfinityDataSource<any>;
}
