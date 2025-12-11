import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnDestroy,
	OnInit,
	Output,
	ViewChild
} from '@angular/core';
import { HorizontalAlignment, UControl } from '@vitweb/framework/base/component';
import {HelperService, KeyboardTypes, ParseEnum, TypeSafeControl} from '@vitweb/framework/core';
import { UTextEdit } from '../control/UTextEdit';
import { ApplicationInformation } from "@vitweb/framework/core";
import {Type} from "../enum/Type";
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'UTextBox',
    templateUrl: './u-text-box.component.html',
    styleUrls: ['./u-text-box.component.scss'],
    providers: [{ provide: UControl, useExisting: UTextBox }]
})
export class UTextBox extends UTextEdit implements OnInit,AfterViewInit,OnDestroy {
    public IsPasswordTemp = false;
	private _isPassword: boolean;
	private _isVisibleKeyboard = false;

	@ViewChild('textboxid', { static: false }) _textboxid: ElementRef;

	@Input() @TypeSafeControl()
    public set IsPassword(value: boolean) {
        this._isPassword = value;
        if (value)
            this.IsPasswordTemp = true;
    }
	public get IsPassword(): boolean {
        return this._isPassword;
    }

	@Input() Id='';
    @Input() IsPartialEnabled: boolean;
	@Input() IsAutoComplete = false;
	@Input() IsShowFullText = false;
	@Input() @ParseEnum(KeyboardTypes) KeyboardType : KeyboardTypes = KeyboardTypes.Alphabet;

	@Output() OnFocus: any = new EventEmitter();
	@Output() OnBlur: any = new EventEmitter();

	// AutoCompleteList özellikleri
	@Input() AutoCompleteList: string[] = [];
	@Input() AutoCompleteListTrigger  = '';

	public filterACL: string[] = [];
	public aclSelectedIndex = -1;
	private aclStartPosition = -1;

	// Listener temizlemek için
	private keyboardListener: any;

	//#region HorizontalAlignment

    private _horizontalAlignment: HorizontalAlignment;
    public HorizontalAlignments: typeof HorizontalAlignment = HorizontalAlignment;

    @Input() @ParseEnum(HorizontalAlignment)
    set IconHorizontalAlignment(value: HorizontalAlignment | keyof typeof HorizontalAlignment) {
        this._horizontalAlignment = typeof (value) === "number" ? value : this.HorizontalAlignments[String(value)];
    }
    get IconHorizontalAlignment(): HorizontalAlignment {
        return this._horizontalAlignment;
    }
    //#endregion
	private _type: Type = Type.Text;
	public Types: typeof Type = Type;

	@Input() @ParseEnum(Type)
	set Type(value: Type | keyof typeof Type) {
		this._type = typeof (value) === "number" ? value : this.Types[String(value)];
	}
	get Type(): Type {
		return this._type;
	}

	@Input() @TypeSafeControl()
	set IsVisibleKeyboard(value: boolean) {
		this._isVisibleKeyboard = value;
	}
	get IsVisibleKeyboard(): boolean {
		return this._isVisibleKeyboard;
	}


    constructor(srvHelper: HelperService,
				public srvTranslate: TranslateService,
				public srvAppInfo: ApplicationInformation) {
        super(srvHelper, srvTranslate);
    }

    ngOnInit() {
        if (this.IsDialogEnabled && this.IsPartialEnabled) {
            this.IsReadOnly = true;
        }
    }

    //#region Events

    onClick() {
        if (this.DialogScreenCode)
            this.ExecuteDialogCommand();
        else
            this.DialogCommand.emit();
    }

	onInput(event: any): void {
		if (this.AutoCompleteList && this.AutoCompleteList.length > 0) {
			this.checkAutoCompleteState(event.target.value);
		}
		super.onInput(event);
	}

		private handleAutoCompleteKeyboard(event: KeyboardEvent): void {
		// SADECE liste açıksa çalış
		if (this.filterACL.length === 0) return;

		const len = this.filterACL.length;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				event.stopPropagation();
				this.aclSelectedIndex = (this.aclSelectedIndex + 1) % len;
				break;

			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				this.aclSelectedIndex = this.aclSelectedIndex <= 0 ? len - 1 : this.aclSelectedIndex - 1;
				break;

			case 'Enter':
				if (this.aclSelectedIndex >= 0) {
					event.preventDefault();
					event.stopPropagation();
					this.selectAutoCompleteListItem(this.filterACL[this.aclSelectedIndex]);
				}
				break;

			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				this.filterACL = [];
				this.aclSelectedIndex = -1;
				break;
		}
	}

    //#endregion

    //#region Private Methods

    enterKeyPressed(): void {
        this.EnterKeyDown.emit();
    }

    tabKeyPressed(): void {
        this.TabKeyDown.emit();
    }

	//#endregion

	//#region AutoCompleteList Methods

	private checkAutoCompleteState(value: string): void {
		if (!value) {
			this.filterACL = [];
			return;
		}

		const lastTriggerIndex = value.lastIndexOf(this.AutoCompleteListTrigger);

		if (lastTriggerIndex === -1) {
			this.filterACL = [];
			return;
		}

		const textAfterTrigger = value.substring(lastTriggerIndex + this.AutoCompleteListTrigger.length);

		if (textAfterTrigger.includes(' ')) {
			this.filterACL = [];
			return;
		}

		this.aclStartPosition = lastTriggerIndex;
		this.filterAutoCompleteList(textAfterTrigger);
	}

	private filterAutoCompleteList(searchText: string): void {
		const MAX_RESULTS = 50;

		if (!searchText) {
			this.filterACL = this.AutoCompleteList.slice(0, MAX_RESULTS);
			this.aclSelectedIndex = -1;
			return;
		}

		const lowerSearchText = searchText.toLowerCase();
		const filtered = [];

		for (let i = 0; i < this.AutoCompleteList.length && filtered.length < MAX_RESULTS; i++) {
			if (this.AutoCompleteList[i].toLowerCase().startsWith(lowerSearchText)) {
				filtered.push(this.AutoCompleteList[i]);
			}
		}

		this.filterACL = filtered;
		this.aclSelectedIndex = -1;
	}

	public selectAutoCompleteListItem(item: string): void {
		const itemValue = this.Text || '';
		const beforeTrigger = itemValue.substring(0, this.aclStartPosition);
		const afterTrigger = itemValue.substring(this.aclStartPosition + this.AutoCompleteListTrigger.length);

		const spaceIndex = afterTrigger.indexOf(' ');
		const afterSelection = spaceIndex === -1 ? '' : afterTrigger.substring(spaceIndex);

		this.Text = beforeTrigger + this.AutoCompleteListTrigger + item + afterSelection;

		this.filterACL = [];
		this.aclSelectedIndex = -1;
	}

	//#endregion

	ngAfterViewInit(): void {
		if(this.OnFocus && this._textboxid){
			this._textboxid.nativeElement.addEventListener('focus',()=>{
				this.OnFocus.emit();
			});
		}

		if(this.OnBlur && this._textboxid){
			this._textboxid.nativeElement.addEventListener('blur',()=>{
				this.filterACL = [];
				this.aclSelectedIndex = -1;
				this.OnBlur.emit();
			});
		}

		// AutoCompleteList varsa klavye listener ekle
		if (this.AutoCompleteList && this.AutoCompleteList.length > 0 && this._textboxid) {
			this.keyboardListener = (event: KeyboardEvent) => {
				this.handleAutoCompleteKeyboard(event);
			};
			this._textboxid.nativeElement.addEventListener('keydown', this.keyboardListener, true);
		}
	}

	ngOnDestroy(): void {
		if(this.OnFocus && this._textboxid){
			this._textboxid.nativeElement.removeEventListener('focus',()=>{
				//console.info('Removed');
			});
		}

		if(this.OnBlur && this._textboxid){
			this._textboxid.nativeElement.removeEventListener('blur',()=>{
				//console.info('Removed');
			});
		}

		// Klavye listenerı temizle
		if (this.keyboardListener && this._textboxid) {
			this._textboxid.nativeElement.removeEventListener('keydown', this.keyboardListener, true);
		}

	}

}
