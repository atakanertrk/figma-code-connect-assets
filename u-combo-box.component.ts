import {
	AfterViewInit,
	ChangeDetectorRef,
	Component,
	ContentChildren,
	ElementRef,
	EventEmitter,
	Input,
	Output,
	QueryList,
	ViewChild
} from '@angular/core';
import {
	FilteringTypes,
	GridExpressionBasedCellTypes,
	IControl,
	LogicalConditions,
	MultipleSelectionTypes,
	RequiredTypes,
	ScreenTooltips,
	UControl,
	UIColors, UIIcons,
	USelector,
	ValidationResult,
	Visibility
} from '@vitweb/framework/base/component';
import {
	ApplicationInformation,
	ConfigurationManager,
	HelperService,
	ParameterProvider,
	ParseEnum,
	SpikeParameterProvider,
	TypeSafeControl
} from '@vitweb/framework/core';
import { UComboColumn } from './u-combo-column';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import {
	ComboBoxComponent,
	MultiColumnComboBoxComponent,
	PopupSettings,
	VirtualizationSettings
} from '@progress/kendo-angular-dropdowns';
import { TranslateService } from '@ngx-translate/core';
import { PreventableEvent } from '@progress/kendo-angular-common';
import { groupBy } from "@progress/kendo-data-query";

@Component({
	selector: 'UComboBox',
	templateUrl: './u-combo-box.component.html',
	styleUrls: ['./u-combo-box.component.scss'],
	providers: [{ provide: UControl, useExisting: UComboBox }]
})
export class UComboBox extends USelector implements IControl, AfterViewInit {

	// #region Private Properties

	private _selectedItems: any[] = [];

	private _selectedValues: any[] = [];

	private _selectedValue: Object;

	private _defaultValue: Object;

	private _parameterGroupCode: string;

	private _mainParameterGroupCode: string;

	private _originalItemsSource: Array<any> = []; //filtreleme yapılırken kullanılacak ItemsSource

	private _itemsSource: Array<any> = []; //Combo'ya bind edilmiş ItemsSource

	private _filter: any;

	private _groupMemberPath: string;

	private _remarkable: any;

	private _remarkablePath: string;

	private _opacityMemberPath: string;

	private _opacityConditionValue: any;

	private _opacityConditionOperation: LogicalConditions;

	public _matchedCellTypes: typeof GridExpressionBasedCellTypes = GridExpressionBasedCellTypes;

	//Filter sonrası _originalItemSource bozulmaması için eklenmiştir.
	private _filterBeforeItemSource: Array<any> = [];

	private _toolTipText: string;

	private _valueType: string;

	private _searchBarTrailingDelimiter = ' ';

	private readonly _compositeFieldName = '__CompositeValue';
	private _valueFieldPath: string; // ValueMemberPath veya __CompositeValue

	@Input() IsCloseAfterSelection = false;

	@Input()
	public get ToolTipText(): string {
		return this._toolTipText;
	}

	public set ToolTipText(value: string) {
		this._toolTipText = value;
	}

	@Input() IsFilterable = true;
	@Input() IsEnabledVirtualScroll = true;

	@Output() SelectedItemsChange: any = new EventEmitter();
	@Output() SelectedValuesChange: any = new EventEmitter();

	@Input() @ParseEnum(MultipleSelectionTypes) MultipleSelectionMode = MultipleSelectionTypes.Single;

	@Input()
	set SelectedItems(value: any[]) {
		if (this._selectedItems !== value) {
			this._selectedItems = value;
			this.setSearchBarTitle();
			this.SelectedItemsChange.emit(value);
		}
	}

	get SelectedItems(): any[] {
		return this._selectedItems;
	}


	@Input() public ClearItemSource = false;


	@Input()
	set SelectedValues(value: any[]) {
		if (this._selectedValues !== value) {
			this._selectedValues = value;
			this.selectedValuesChanged(this._selectedValues);
			this.SelectedValuesChange.emit(value);
		}
	}

	get SelectedValues(): any[] {
		return this._selectedValues;
	}

	//#region IsFirstItemSelectedByDefault

	@Input() IsFirstItemSelectedByDefault = false;

	//#endregion

	//#region IsAllowedCustomValue

	@Input() IsAllowedCustomValue = false;

	//#endregion

	//#region  ItemHeight
	private readonly _defaultItemHeight = 28;
	private readonly _defaultNativeItemHeight = 40;

	@Input() ItemHeight = this._defaultItemHeight;

	//#endregion

	//#region  PageSize , ##INPUT OLARAK VERMEYINIZ PERFORMANS SORUNUNA SEBEBIYET VERİR
	public PageSize = 10;

	public VirtualSettings: boolean | VirtualizationSettings = false;

	//#region DropDownHeight

	@Input() DropDownHeight = 0;

	@Input() ClearTooltipText = 'Temizle';

	@Input() IsCurrency = false;

	@Input() PrefixIcon: UIIcons;
	@Input() PrefixIconColor: UIColors;

	@Input() RowColorMemberPath: string;


	/**
	 * Sol tarafta renkli yuvarlak rozet görünmesi için
	 **/
	@Input() IsCircleBadgeVisible: boolean = false;

	//#endregion

	/**
	 * Value in ValueMemberPath can be written
	 **/
	@Input()
	public get Remarkable(): any {
		return this._remarkable;
	}

	public set Remarkable(value: any) {
		if (this._remarkable != value) {
			this._remarkable = value;
		}
	}

	private remarkableItems = [];

	/**
	 *
	 */


	/*
	* Default ValueMemberPath
	 */
	@Input() @TypeSafeControl()
	public get RemarkablePath(): string {
		return this._remarkablePath;
	}

	public set RemarkablePath(value: string) {
		if (this._remarkablePath != value) {
			this._remarkablePath = value;
		}
	}

	/*
	*
	  */
	@Input() @TypeSafeControl()
	public get OpacityMemberPath(): string {
		return this._opacityMemberPath;
	}

	public set OpacityMemberPath(value: string) {
		if (this._opacityMemberPath != value) {
			this._opacityMemberPath = value;
		}
	}

	public getRowStyle(item: any): any {
		if (!item) return {};

		// Satır seçiliyse hiç stil verme, Kendo kendisi boyayacak
		if (this.SelectedItem === item) {
			return {
				width: '100%',
				padding: '4px 8px',
				boxSizing: 'border-box'
			};
		}

		const rowColor = this.RowColorMemberPath ? item[this.RowColorMemberPath] : null;
		if (rowColor) {
			return {
				backgroundColor: rowColor,
				width: '100%',
				padding: '4px 8px',
				boxSizing: 'border-box'
			};
		}

		return {
			width: '100%',
			padding: '4px 8px',
			boxSizing: 'border-box'
		};
	}

	/*
	*
	  */
	@Input()
	public get OpacityConditionValue(): any {
		return this._opacityConditionValue;
	}

	public set OpacityConditionValue(value: any) {
		if (this._opacityConditionValue != value) {
			this._opacityConditionValue = value;
		}
	}

	private opacityItems = [];

	@Input() @TypeSafeControl()
	public get GroupMemberPath(): string {
		return this._groupMemberPath;
	}

	public set GroupMemberPath(value: string) {
		if (this._groupMemberPath != value) {
			this._groupMemberPath = value;
		}
	}

	//#region DropDownWidth

	@Input() DropDownWidth = 0;

	//#endregion


	@ContentChildren(UComboColumn) columnList: QueryList<UComboColumn>;

	// Combobox element.
	@ViewChild('combobox', { static: false }) _combobox: ComboBoxComponent | MultiColumnComboBoxComponent;
	@ViewChild('select', { static: false }) _select: ElementRef;

	private _columns: Array<UComboColumn> = [];

	public DefaultComboColumnName = UIColors.Black;

	public FilterChangeEvent = new Subject<any>();


	@Input()
	public get Filter(): any {
		return this._filter;
	}

	public set Filter(value: any) {
		if (this._filter != value) {
			this._filter = value;
			//this._filterBeforeItemSource = this._originalItemsSource;
			this._itemsSource = this.filterItems(this._originalItemsSource);
			this._itemsSource = this.sortItems(this._itemsSource);

			if (this.ClearItemSource === true && this._selectedValue != null) {
				const stillExists = this._itemsSource.some(item =>
					item[this.ValueMemberPath] == this._selectedValue
				);

				if (!stillExists) {
					this.Clear();
				}
			}
			this.applySelectedItem();

		}
	}

	@Input()
	public get Columns(): Array<UComboColumn> {
		return this._columns?.filter(x => x.Visibility === Visibility.Visible);
	}

	public set Columns(v: Array<UComboColumn>) {
		this._columns = v;
	}

	/**
	 * Ctor.
	 * @param parameterProvider
	 * @param helperService
	 * @param spikeParameterProvider
	 * @param srvAppInfo
	 * @param srvTranslate
	 * @param cdr
	 */
	constructor(private parameterProvider: ParameterProvider,
				private helperService: HelperService,
				private spikeParameterProvider: SpikeParameterProvider,
				public srvAppInfo: ApplicationInformation,
				private srvTranslate: TranslateService,
				private cdr: ChangeDetectorRef) {
		super();
	}

	public get valueFieldPath(): string
	{
		return this._valueFieldPath ?? (this.ValueMemberPath ? this.ValueMemberPath : '');
	}

	private normalizeDescription(v: any): string
	{
		return String(v ?? '').trim();
	}

	private prepareIdentityFields(): void
	{
		const items = this._itemsSource;

		if (!Array.isArray(items) || items.length === 0)
		{
			this._valueFieldPath = this.ValueMemberPath ? this.ValueMemberPath : '';
			return;
		}

		const codeField = this.ValueMemberPath || 'Code';
		const descriptionField = this.DisplayMemberPath || 'Description';
		const map = new Map<any, Set<string>>();

		for (const item of items)
		{
			if (!item) continue;

			const code = item[codeField];
			const description = this.normalizeDescription(item[descriptionField]);

			if (!map.has(code))
				map.set(code, new Set());

			map.get(code)?.add(description);
		}

		let hasDuplicates = false;

		for (const set of map.values())
		{
			if (set.size > 1) { hasDuplicates = true; break; }
		}

		if (hasDuplicates)
		{
			for (const item of items)
			{
				if (!item) continue;

				const code = item[codeField];
				const description = this.normalizeDescription(item[descriptionField]);

				item[this._compositeFieldName] = `${code}¦${description}`;
			}

			this._valueFieldPath = this._compositeFieldName;
		}
		else
		{
			this._valueFieldPath = codeField;
		}
	}

	public get IsMultipleSelectionEnabled() {
		return this.MultipleSelectionMode === MultipleSelectionTypes.Multiple;
	}

	public get HasIconAllRows(){
		if(this.ItemsSource)
			return this.ItemsSource.filter(w=>w.IconType).length > 0;

		return false;
	}

	get popupSettings(): PopupSettings {
		const settings: PopupSettings = {};

		let popupClass = 'combobox-popup';

		if (this.IsMultipleSelectionEnabled)
			popupClass += ' multiselect';

		settings.popupClass = popupClass;
		settings.animate = false;

		if (this.DropDownHeight > 0) settings.height = this.DropDownHeight;
		if (this.DropDownWidth > 0) settings.width = this.DropDownWidth;

		return settings;
	}

	get multiPopupSettings(): PopupSettings {
		const settings: PopupSettings = {};

		let popupClass = 'multi-column-combobox-popup';

		if (this.IsMultipleSelectionEnabled)
			popupClass += ' multiselect';

		settings.popupClass = popupClass;
		settings.animate = false;

		if (this.DropDownHeight > 0)
			settings.height = this.DropDownHeight;

		if (window.innerWidth < this.DropDownWidth) {
			if (this.DropDownWidth > 0) settings.width = window.innerWidth;
		} else {
			if (this.DropDownWidth > 0) settings.width = this.DropDownWidth;
		}

		return settings;
	}

	// #endregion Private Properties

	// #region Public Properties

	public ValueNormalizer = (text: Observable<string>) => text.pipe(map((value: string) => ({
		[this.DisplayMemberPath]: value,
		[this.ValueMemberPath]: value
	})));

	//#region SelectedValue

	@Input()
	set SelectedValue(value: Object) {
		this.selectedValueChanged(this, this._selectedValue, value);
	}

	get SelectedValue(): Object {
		return this._selectedValue;
	}

	//#endregion

	//#region

	@Input()
	set ValueType(valueType: string) {
		if (this._valueType !== valueType) {
			this._valueType = valueType;
		}
	}

	get ValueType(): string {
		return this._valueType;
	}

	//#endregion

	//#region DefaultValue

	@Input()
	set DefaultValue(prm: Object) {
		this._defaultValue = prm;
	}

	get DefaultValue(): Object {
		return this._defaultValue;
	}

	//#endregion

	//#region ParameterGroupCode

	@Input() @TypeSafeControl()
	set ParameterGroupCode(prm: string) {
		this._parameterGroupCode = prm;
		this.loadItemSourceByParameter();
	}

	get ParameterGroupCode(): string {
		return this._parameterGroupCode;
	}

	//#endregion

	//#region MainParameterGroupCode

	@Input() @TypeSafeControl()
	set MainParameterGroupCode(prm: string) {
		this._mainParameterGroupCode = prm;
		this.loadItemSourceByParameter();
	}

	get MainParameterGroupCode(): string {
		return this._mainParameterGroupCode;
	}

	//#endregion

	//#region ItemsSource

	@Input()
	set ItemsSource(prm: Array<any>) {

		if (prm === null || prm === undefined || (prm && prm.length == 0)) {
			this._itemsSource = prm;
			this.SelectedValue = undefined;
			this.SelectedItem = undefined;
			//this._filterBeforeItemSource = [];
			setTimeout(() => {
				this.cdr.detectChanges();
			}, 1);
		}

		this._itemsSource = this.sortItems(prm);
		this._originalItemsSource = this.sortItems(prm);

		if (this.GroupMemberPath) {
			this._originalItemsSource = Object.assign([], prm);
			this._itemsSource = groupBy(prm, [{ field: this.GroupMemberPath },]);
		}

		this.prepareIdentityFields();

		this.applySelectedItem();


		/* Itemssource değiştiğinde SelectedItem ve Value'ya atama yapma*/
        setTimeout(() => {
            if (this.SelectedItem) {
                this.SelectedValue = this.SelectedItem ? this.SelectedItem[this.ValueMemberPath] : undefined;
                this.SelectedItemChange.emit(this.SelectedItem);
                this.SelectedValueChange.emit(this.SelectedValue !== undefined ? this.selectedValueConverter(typeof (this.SelectedValue)) : this.SelectedValue);
            } else {
                if (this.SelectedItem && this.ValueMemberPath)
                    this.SelectedValue = this.SelectedItem[this.ValueMemberPath];
                this.SelectedItemChange.emit(this.SelectedItem);
                this.SelectedValueChange.emit(this.SelectedValue !== undefined ? this.selectedValueConverter(typeof (this.SelectedValue)) : this.SelectedValue);
            }
        }, 0);

	}

	get ItemsSource(): Array<any> {
		return this._itemsSource;
	}

	get OriginalItemSource(): Array<any> {
		return this._originalItemsSource;
	}

	// #endregion Public Properties

	//#region Private Methods

	getParameterValue(column: UComboColumn, item: any): string {
		let resultDescription: string;
		if (item !== null && item !== undefined &&
			column.ParameterData &&
			column.ParameterData.length > 0 &&
			column.ParameterData.some(x => x.Code === item.toString())) {
			resultDescription = column.ParameterData.filter(x => x.Code === item.toString())[0].Description;
		}
		return resultDescription;
	}

	/**
	 * Fills items source with specified parameter group code.
	 */
	private loadItemSourceByParameter(): void {

		// region fix item source for designer
		if (ConfigurationManager.ConfigData.IsInDesigner) {
			if (this.ParameterGroupCode === '') {
				this.ItemsSource = undefined; //for designer
				this.__parameterGroupCode = undefined;
			}

			if (this.MainParameterGroupCode === '') {
				this.ItemsSource = undefined; //for designer
				this._mainParameterGroupCode = undefined;
			}
		}

		if (!this._parameterGroupCode)
			return;

		if (!this.ValueMemberPath)
			this.ValueMemberPath = 'Code';

		if (!this.DisplayMemberPath)
			this.DisplayMemberPath = 'Description';

		if (ConfigurationManager.ConfigData.IsSpike) {
			this.spikeParameterProvider.Get(this._parameterGroupCode, this._mainParameterGroupCode).subscribe((response: any) => {

				if (this.Filter) {
					this.ItemsSource = this.filterItems(response.Data);
				} else {
					if (this._mainParameterGroupCode == response.mainGroupCode) {
						this.ItemsSource = response.Data;
					}
				}

				this._itemsSource = this.sortItems(this.ItemsSource);
			});
		} else {
			this.parameterProvider.Get(this._parameterGroupCode, this._mainParameterGroupCode).subscribe((response: any) => {

				if (this.Filter) {
					this.ItemsSource = this.filterItems(response.Data);
				} else {
					if (this._mainParameterGroupCode == response.mainGroupCode) {
						this.ItemsSource = response.Data;
					}
				}

				this._itemsSource = this.sortItems(this.ItemsSource);
			});
		}


	}

	/**
	 * Triggered when selected value property is changed.
	 * @param sender
	 * @param oldValue
	 * @param newValue
	 */
	private selectedValueChanged(sender: UComboBox, oldValue: Object, newValue: Object): void {
		if (oldValue == newValue || this.helperService.IsNullOrEmpty(oldValue) && this.helperService.IsNullOrEmpty(newValue))
			return;

		// Syhncronize SelectedValue and SelectedItem properties
		if (sender.ItemsSource && sender.ItemsSource.length > 0) {

			for (const item of sender.ItemsSource) {

				if (sender.ValueMemberPath) {
					if (item[sender.ValueMemberPath] == newValue) {
						this._selectedValue = item[sender.ValueMemberPath];
						this.SelectedItem = item;
						this.valueChange(this.SelectedItem, typeof (newValue));
						return;
					}
				} else {
					if (item == newValue) {
						this._selectedValue = item[sender.ValueMemberPath];
						this.SelectedValueChange.emit(this.selectedValueConverter(typeof (newValue)));
						return;
					}
				}
			}

			this._selectedValue = newValue;
			this.SelectedItem = undefined;
			this.valueChange(newValue, typeof (newValue));
		} else {
			this._selectedValue = newValue;
		}
	}

	/**
	 * Triggered when selected values property is changed.
	 */
	private selectedValuesChanged(selectedValues: any[]): void {
		if (this._itemsSource && selectedValues && selectedValues.length > 0) {
			const selectedItems = [];

			for (const selectedValue of selectedValues) {
				const selectedItem = this._itemsSource.find(item => item[this.ValueMemberPath] === selectedValue);

				if (selectedItem)
					selectedItems.push(selectedItem);
			}

			this.SelectedItems = selectedItems;
		} else {
			this.SelectedItems = [];
		}
	}

	/**
	 * Combo value change event
	 * @param item - Selected Item.
	 */
	valueChange(item: any, typeofNewValue?: string): any
	{
		// Örnek ("1¦ABD") geldiyse ilgili itemı bul
		const codeField = this.ValueMemberPath || 'Code';
		const usingComposite = (this.valueFieldPath === this._compositeFieldName);

		if (!this.IsMultipleSelectionEnabled)
		{
				if (usingComposite && item != null && typeof item !== 'object')
				{
					const found = this._itemsSource?.find(x => x?.[this._compositeFieldName] === item);
					if (found)
					{
						item = found;
						typeofNewValue = typeof found?.[codeField];
					}
			}
		}

		if (this.IsMultipleSelectionEnabled) {
			if (this._combobox)
				this._combobox.value = undefined; // seçili iteme tekrar basılırsa tetiklenmesi için

			return this.MultipleSelectItem(item);
		}

		if (item && (item[this.ValueMemberPath] || item[this.ValueMemberPath] === 0)) {

			if (this.ValueMemberPath) {
				this._selectedValue = item ? item[this.ValueMemberPath] : undefined;
			} else {
				this._selectedValue = item;
			}

			//value SelectedItem üzerinden dolduğundan her zaman SelectedItem setlenmeli
			this.SelectedItem = item || undefined;
		} else {
			this._selectedValue = item;
			if (this.ItemsSource && this.ItemsSource.filter(prm => prm[this.ValueMemberPath] === item).length > 0) {
				this.SelectedItem = this.ItemsSource.filter(prm => prm[this.ValueMemberPath] === item)[0];
			} else {
				this.SelectedItem = undefined;
			}
		}

		this.SelectedItemChange.emit(this.SelectedItem);
		this.SelectedValueChange.emit(this.selectedValueConverter(typeofNewValue));

		// Filtreleme sonucu ItemsSource değiştiğinden null, undefined gibi setlemelerde orjinal ItemsSource'a dönülmeli
		if (!item && this._itemsSource && this._originalItemsSource && this._itemsSource.length !== this._originalItemsSource.length) {
			if (this.Filter && this.Filter.length > 0) {
				this._itemsSource = this.filterItems(this._originalItemsSource);
			} else {
				this._itemsSource = this._originalItemsSource.slice(0);
			}
		}

		this.setValidationState(true,"");
	}


	private selectedValueConverter(typeofNewValue: string): any {

		if (!this.helperService.IsNullOrEmpty(this.ValueType))
			typeofNewValue = this.ValueType;

		//UI'da bind edilmiş objenin typeof ile itemsoruce'dan bulunun selectedValue typeof'un aynı olması için eklenmiştir.
		let tempSelectedValue: Object;
		if (typeof (this.SelectedValue) !== 'undefined' && typeofNewValue !== 'undefined' && typeof (this.SelectedValue) !== typeofNewValue) {
			switch (typeofNewValue) {
				case 'number':
					tempSelectedValue = +this.SelectedValue;
					return tempSelectedValue;

				case 'string':
					tempSelectedValue = this.SelectedValue.toString();
					return tempSelectedValue;
				default:
					tempSelectedValue = this.SelectedValue;
					return tempSelectedValue;
			}
		} else {
			tempSelectedValue = this.SelectedValue;
		}

		return tempSelectedValue;
	}

	/**
	 * Filter Change
	 * @param filter
	 */
	filterChange(filter: any): void {

		this.FilterChange.emit(filter);

		if (this.helperService.IsNullOrEmpty(this._originalItemsSource)) return;

			let expression: (item: any) => boolean;

			if (this.Columns.length > 0) {
				expression = (item) =>
					this.Columns
						.map(col => this.filterExpression(item, col.ColumnName, filter))
						.some(exp => exp);
			} else {
				expression = (item) =>
					this.filterExpression(item, this.ValueMemberPath, filter) ||
					this.filterExpression(item, this.DisplayMemberPath, filter);
			}

			if (this.Filter) {
				const filteredItemsSource = this.filterItems(this._originalItemsSource);
				this._itemsSource = filteredItemsSource.filter(expression);
			} else {
				this._itemsSource = this._originalItemsSource.filter(expression);
			}

			this._itemsSource = this.sortItems(this._itemsSource);

			let findItem = this._itemsSource.find((x: any) => x[this.ValueMemberPath] == this.DefaultValue);
			if (!this.helperService.IsNullOrEmpty(this.DefaultValue) && findItem) {
				this.SelectedItem = findItem;
				this.SelectedValue = findItem[this.ValueMemberPath];
			}

			this.cdr.detectChanges();
			if (this._combobox && this._combobox.optionsList)
				this._combobox.optionsList['cdr'].detectChanges();
	}

	/**
	 * ItemsSource filtrelenmesini sağlar
	 * @param data
	 * @private
	 */
	private sortItems(data: any) {
		if (this.SortMemberPath && data) {
			return this.helperService.Sort(data, this.SortMemberPath, this.SortType, this.ListSortDirection);
		} else {
			return data;
		}
	}

	/**
	 * Filter inputu için mevcut itemsourceun filtrelenmesini sağlar
	 * @param data
	 * @private
	 */
	private filterItems(data: any[]): any[] {
		if (this.Filter instanceof Function) {
			return data.filter(this.Filter);
		}

		if (this.Filter instanceof Array) {
			let filter = this.Filter as Array<string>;
			if (filter.length === 0)
				return data;

			return data.filter(x => filter.includes(x[this.ValueMemberPath]));
		}

		return data;
	}

	/**
	 * Filtre expressionı döndürür
	 * @private
	 * @param item
	 * @param field item alanı
	 * @param filter aranan değer
	 */
	private filterExpression = (item: any, field: string, filter: string): boolean =>
		field in item &&
		String(item[field])
			.toLocaleLowerCase('tr-TR')
			.includes(filter.toLocaleLowerCase('tr-TR'));

	//#endregion

	// #region Public Methods

	/**
	 * Sets state of component to its initial state.
	 */
	Clear(): void {
		this.filterChange(''); // ItemSource'un orjinal haline alınması için

		this.SelectedValue = undefined;
		this.SelectedItem = undefined;
		this.SelectedValueChange.emit(undefined);
		this.SelectedItemChange.emit(undefined);

		this.SelectedItems = [];
		this.SelectedValues = [];

		if (this._combobox) {
			this._combobox.reset();
		}

		this.setValidationState(true, '');
	}

	/**
	 * Focuses component.
	 */
	Focus(): void {
		const element = this._combobox?.['wrapper']?.nativeElement?.children[0];
		element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		// element?.focus({preventScroll: true}); // combobox seçeneklerinin açılmaması için commentlendi
	}

	/**
	 * Validates whether component is in valid state to do specified operation.
	 * @param requiredType
	 */
	Validate(requiredType: RequiredTypes): ValidationResult {

		if (this.IsEnabled && this.Visibility === Visibility.Visible) {

			if (!this.helperService.IsNullOrEmpty(this.SelectedValue)) {
				return this.setValidationState(true, '');
			}

			if (this.MultipleSelectionMode == MultipleSelectionTypes.Multiple && !this.helperService.IsNullOrEmptyObject(this.SelectedItems)) {
				return this.setValidationState(true, '');
			}

			if (RequiredTypes.RequiredForRead === requiredType) {
				if (this.IsRequiredForRead) {
					return this.setValidationState(false, this.srvTranslate.instant(ScreenTooltips.COMBOBOX_IS_REQUIRED_FOR_READ_ERROR));
				} else {
					return this.setValidationState(true, '');
				}
			} else {
				if (RequiredTypes.RequiredForSave === requiredType) {
					if (this.IsRequiredForSave) {
						return this.setValidationState(false, this.srvTranslate.instant(ScreenTooltips.COMBOBOX_IS_REQUIRED_FOR_SAVE_ERROR));
					} else {
						return this.setValidationState(true, '');
					}
				}
			}
		}

		return this.setValidationState(true, '');
	}

	/**
	 *
	 * @param errorMessage
	 * @constructor
	 */
	SetValidationError(errorMessage: string) {
		this.IsValid = false;
		this.ValidationErrorContent = errorMessage;
	}

	/**
	 *
	 * @constructor
	 */
	ClearValidationError() {
		this.IsValid = true;
		this.ValidationErrorContent = '';
	}

	// #endregion Public Methods


	//#region LC Hooks

	ngAfterViewInit(): void {
		this._columns = this.columnList.toArray();

		if (this._columns && this._columns.length > 0) {
			this._columns.forEach((column: any) => {
				if (!column.Width || !(/^[0-9]+$/.test(column.Width))) {
					column.Width = 150;
				}
			});
		}

		if (this.srvAppInfo.IsInNative && this.ItemHeight === this._defaultItemHeight) {
			this.ItemHeight = this._defaultNativeItemHeight;
		}

		this.FilterChangeEvent
			.pipe(startWith(''), debounceTime(250), distinctUntilChanged())
			.subscribe((filter) => this.filterChange(filter));

		if (this.IsMultipleSelectionEnabled) {
			this.ItemHeight = 35;
			this.setSearchBarTitle();

			// çoklu seçim modunda arama kısmına yazılırsa önceden seçilen itemler siliniyor
			this._combobox.searchbar.valueChange.subscribe((value: string) => {
				if (this.SelectedItems.length > 0) {
					const searchValueStartIndex = value.lastIndexOf(this._searchBarTrailingDelimiter) + 1;
					const searchValue = value.substring(searchValueStartIndex, value.length);
					this._combobox.searchbar.input.nativeElement.value = searchValue;
				}
			});
		}

		if (this.IsEnabledVirtualScroll) {
			if (this.DropDownHeight && this.DropDownHeight > 200) {
				this.PageSize = Math.ceil(this.DropDownHeight / this.ItemHeight);
			}

			this.VirtualSettings = {
				itemHeight: this.ItemHeight,
				pageSize: this.PageSize
			};
		}
	}

	public OnFocus() {
		this._combobox?.toggle(true);
	}

	public OnClose(event: PreventableEvent) {
		if (this.IsMultipleSelectionEnabled) {
			event.preventDefault();

			// Close the list if the component is no longer focused
			setTimeout(() => {
				if (!this._combobox['wrapper'].nativeElement.contains(document.activeElement)) {
					this._combobox.toggle(false);
				}
			});
		}
	}

	public OnOpen(event: PreventableEvent) {
		setTimeout(() => {
		}, 2000);
	}

	public OnBlur() {
		this.setSearchBarTitle();
	}

	public IsMultipleItemSelected(dataItem) {
		return this.SelectedItems.includes(dataItem);
	}

	public MultipleSelectItem(dataItem: any) {
		if (!dataItem)
			return;

		const isMultipleItemSelected = this.IsMultipleItemSelected(dataItem);

		if (isMultipleItemSelected) {
			this.SelectedItems = this.SelectedItems.filter(item => item !== dataItem);
		} else {
			this.SelectedItems = [...this.SelectedItems, dataItem];
		}

		this.SelectedValues = this.SelectedItems.map(i => i[this.ValueMemberPath]);
	}

	public SelectAll(event: any) {
		event.stopPropagation(); // combobox kapanmaması için

		if (event.target.checked) {
			this.SelectedItems = Object.assign([], this.ItemsSource);
		} else {
			this.SelectedItems = [];
		}

		this.SelectedValues = this.SelectedItems.map(i => i[this.ValueMemberPath]);

	}

	private setSearchBarTitle() {
		if (this.SelectedItems && this.IsMultipleSelectionEnabled && this._combobox) {
			setTimeout(() => {
				if (this.SelectedItems.length > 0) {
					const selectedValuesTitle = this.SelectedItems.map(i => i[this.DisplayMemberPath]).join(', ');
					this._combobox.searchbar.input.nativeElement.value = selectedValuesTitle + this._searchBarTrailingDelimiter;
				} else {
					this._combobox.searchbar.input.nativeElement.value = '';
				}
			});
		}
	}

	private applySelectedItem() {
		if (this._itemsSource && this._itemsSource.length > 0) {

			if (this.IsFirstItemSelectedByDefault)
				this.SelectedItem = this._itemsSource[0];

			else if (!this.helperService.IsNullOrEmpty(this.SelectedValue))
				//== UI'dan gelen typeof ile içeride bulunan typeof(this.SelectedValue) farklı olmasından kaynaklı değiştirildi.
				this.SelectedItem = this._itemsSource.find((x: any) => x[this.ValueMemberPath] == this.SelectedValue);

			else if (!this.helperService.IsNullOrEmpty(this.DefaultValue))
				this.SelectedItem = this._itemsSource.find((x: any) => x[this.ValueMemberPath] == this.DefaultValue);


			if (this.Remarkable) { // Dikkat �ekici row combobox'?n en �st�nde bulunsun amac?ylad?r.
				if (this.RemarkablePath) {
					this.remarkableItems = this._itemsSource.filter((x: any) => x[this.RemarkablePath] == this.Remarkable);
				} else
					this.remarkableItems = this._itemsSource.filter((x: any) => x[this.ValueMemberPath] == this.Remarkable);
				if (this.remarkableItems && this.remarkableItems.length > 0) {
					for (const ind in this._itemsSource) {
						if (this.remarkableItems.indexOf((this._itemsSource[ind])) !== -1) {
							const myObject = this._itemsSource[ind];
							this._itemsSource.splice(this._itemsSource.indexOf(myObject), 1);
							this._itemsSource.unshift(myObject);
						}
					}
				}
			}

			if (this.OpacityMemberPath && this.OpacityConditionValue) { // Silik gözükmesi istenilen satırlar var mı ?
				this.opacityItems = this._itemsSource.filter((x: any) => x[this.OpacityMemberPath] == this.OpacityConditionValue);
			}

			if (this.SelectedValues) {
				this.selectedValuesChanged(this.SelectedValues);
			}

		}
	}

	//#endregion
}
