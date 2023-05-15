/*******************************************************************************
 * 创建: 2022年11月27日
 * 作者: 水煮肉片饭(27185709@qq.com)
 * 描述: 动作残影
 *      给节点添加残影，残影会跟随节点移动，并跟随节点播放动画。
 *      使用举例：动作类游戏中，主角释放连击必杀
*******************************************************************************/
const { ccclass, property, executeInEditMode, playOnFocus, menu } = cc._decorator;
class ShadowData {
    x: number = 0;
    y: number = 0;
    angle: number = 0;
    scaleX: number = 1;
    scaleY: number = 1;
    scale: number = 1;          //向尾部递减的缩放系数
    actionName: string = '';
    frameTime: number = 0;
}
@ccclass
@executeInEditMode
@playOnFocus
@menu('Comp/ActionShadow')
export default class ActionShadow extends cc.Component {
    @property
    private _active: boolean = true;
    @property({ displayName: CC_DEV && '是否激活', tooltip: CC_DEV && '设置残影可见性\n激活会重置残影位置' })
    get active() { return this._active; }
    set active(value: boolean) {
        this._active = value;
        if (value) {
            if (this.node.active && this.shadowNode) {
                this.shadowNode.active = true;
                this.shadowData.length && this.updateShadowData();
            }
        } else {
            this.shadowNode.active = false;
        }
    }
    @property()
    private _shadowNum: number = 10;
    @property({ type: cc.Integer, displayName: CC_DEV && '残影数量' })
    private get shadowNum(): number { return this._shadowNum; }
    private set shadowNum(value: number) {
        this._shadowNum = Math.max(value, 0);
        this.updateShadowNum();
        this.updateDeltTime();
        this.updateShadowData();
        this.updateColor();
    }
    @property()
    private _deltTime: number = 4;
    @property({ type: cc.Integer, displayName: CC_DEV && '延迟帧数' })
    private get deltTime(): number { return this._deltTime; }
    private set deltTime(value: number) {
        this._deltTime = Math.max(value, 1);
        this.updateDeltTime();
        this.updateShadowData();
    }
    @property()
    private _shadowColor: cc.Color = cc.color(255, 255, 255);
    @property({ displayName: CC_DEV && '残影颜色' })
    private get shadowColor(): cc.Color { return this._shadowColor; }
    private set shadowColor(value: cc.Color) {
        this._shadowColor = value;
        this.updateColor();
    }
    @property()
    private _shadowScale: number = 0.1;
    @property({ min: 0, max: 1, step: 0.1, slide: true, displayName: CC_DEV && '尾部缩放系数' })
    private get shadowScale(): number { return this._shadowScale; }
    private set shadowScale(value: number) {
        this._shadowScale = value;
        this.updateShadowData();
    }
    @property()
    private _opacity: number = 50;
    @property({ type: cc.Integer, min: 0, max: 255, slide: true, displayName: CC_DEV && '透明度' })
    private get opacity(): number { return this._opacity; }
    private set opacity(value: number) {
        this._opacity = value;
        this.updateOpacity();
    }
    private nodeOpacity: number = 255;
    private model: cc.Animation = null;
    private shadowNode: cc.Node = null;
    private shadowData: ShadowData[] = [];

    protected start() {
        let shadowNodeName = this.node.name + '<ActionShadow>';
        this.shadowNode = this.node.parent.getChildByName(shadowNodeName)
        if (!this.shadowNode) {
            this.shadowNode = new cc.Node(shadowNodeName);
            this.shadowNode.setParent(this.node.parent);
            this.shadowNode.setSiblingIndex(this.node.getSiblingIndex());
        }
        if (CC_EDITOR) {
            this.shadowNode['_objFlags'] = 0;
            this.shadowNode['_objFlags'] |= cc.Object['Flags'].HideInHierarchy;
            this.shadowNode['_objFlags'] |= cc.Object['Flags'].LockedInEditor;
        }
        this.nodeOpacity = this.node.opacity;
        this.model = this.node.getComponent(cc.Animation);
        this.model && (this.model.currentClip = this.model.defaultClip);
        this.node['_updateWorldMatrix']();
        this.updateShadowNum();
        this.updateDeltTime();
        this.updateShadowData();
        this.updateColor();
        this.updateOpacity();
    }

    protected onEnable() {
        if (this.active && this.shadowNode) {
            this.shadowNode.active = true;
            this.shadowData.length && this.updateShadowData();
        }
    }

    protected onDisable() {
        this.shadowNode.active = false;
    }

    protected update() {
        if (this.nodeOpacity !== this.node.opacity) {
            this.nodeOpacity = this.node.opacity;
            this.updateOpacity();
        }
        for (let i = this.shadowNum * this.deltTime; i > 0; --i) {
            let cur = this.shadowData[i];
            let prev = this.shadowData[i - 1];
            cur.x = prev.x;
            cur.y = prev.y;
            cur.scaleX = prev.scaleX;
            cur.scaleY = prev.scaleY;
            cur.angle = prev.angle;
            cur.actionName = prev.actionName;
            cur.frameTime = prev.frameTime;
        }
        let data = this.shadowData[0];
        let matrix = this.node['_worldMatrix'].m;
        data.x = matrix[12];
        data.y = matrix[13];
        data.scaleX = this.node.scaleX;
        data.scaleY = this.node.scaleY;
        data.angle = this.node.angle;
        if (this.model !== null) {
            data.actionName = this.model.currentClip.name;
            data.frameTime = this.model.getAnimationState(data.actionName).time;
        }
        matrix = this.shadowNode['_worldMatrix'].m;
        for (let i = this.shadowNum - 1; i >= 0; --i) {
            let node = this.shadowNode.children[i];
            data = this.shadowData[this.deltTime * (i + 1)];
            node.x = data.x - matrix[12];
            node.y = data.y - matrix[13];
            node.scaleX = data.scaleX * data.scale;
            node.scaleY = data.scaleY * data.scale;
            node.angle = data.angle;
            let model = node.getComponent(cc.Animation);
            model !== null && model.play(data.actionName, data.frameTime);
        }
    }

    private updateShadowNum() {
        this.shadowNode.removeAllChildren();
        this.shadowNode.destroyAllChildren();
        for (let i = 0, len = this.shadowNum; i < len; ++i) {
            let node = cc.instantiate(this.node);
            node.name = `${this.node.name}${i}`;
            let cmps = node['_components'];
            for (let j = cmps.length - 1; j >= 0; --j) {
                if (cmps[j] instanceof cc.RenderComponent) continue;
                if (cmps[j] instanceof cc.Animation) continue;
                cmps[j].destroy();
            }
            node.setParent(this.shadowNode);
        }
    }

    private updateDeltTime() {
        this.shadowData = [];
        for (let i = this.shadowNum * this.deltTime; i >= 0; --i) {
            this.shadowData[i] = new ShadowData();
        }
    }

    private updateShadowData() {
        let scaleDelt = (1 - this.shadowScale) / (this.shadowNum * this.deltTime);
        let matrix = this.node['_worldMatrix'].m;
        for (let i = this.shadowNum * this.deltTime; i >= 0; --i) {
            let data = this.shadowData[i];
            data.x = matrix[12];
            data.y = matrix[13];
            data.scaleX = this.node.scaleX;
            data.scaleY = this.node.scaleY;
            data.scale = 1 - i * scaleDelt;
            data.angle = this.node.angle;
            if (this.model !== null) {
                data.actionName = this.model.currentClip.name;
                data.frameTime = this.model.getAnimationState(data.actionName).time;
                this.model.play(data.actionName, data.frameTime);
            }
        }
    }

    private setColor(node: cc.Node, color: cc.Color) {
        node.color = color;
        for (let i = node.childrenCount - 1; i >= 0; --i) {
            this.setColor(node.children[i], color);
        }
    }

    private updateColor() {
        this.setColor(this.shadowNode, this.shadowColor);
    }

    private updateOpacity() {
        this.shadowNode.opacity = this.opacity * this.node.opacity / 255;
    }

    protected onDestroy() {
        if (cc.isValid(this.shadowNode)) {
            this.shadowNode.removeFromParent();
            this.shadowNode.destroy();
        };
    }
}