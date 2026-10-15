import { useId, type SyntheticEvent } from 'react';
import { cityControlsModel, CONTROL_CITY_LABELS, type CityControlsState, type ControlCityType } from './cityControlsModel';
import './cityControls.css';

export interface CityControlsProps extends CityControlsState {
  onConvert: (type: ControlCityType) => void;
  onFly: () => void;
  onGround: () => void;
  onCancel: () => void;
  onClose: () => void;
}
/** Render only for an actionable owned selection. Parent owns Escape, focus restoration and lifecycle clearing.
 * Place as a flex sibling below the field, not over the Canvas; reserve its height in the viewport layout.
 */
export function CityControls(props: CityControlsProps) {
  const id = useId();
  const model = cityControlsModel(props);
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return <section className="city-controls" aria-label="Selected city controls"
    onPointerDown={stop} onPointerUp={stop} onClick={stop}>
    <div className="city-controls__selection">
      <div><strong>{props.name} · {CONTROL_CITY_LABELS[props.cityType]}</strong>
        <span>{props.troops} garrison troops · {props.cityType === 'production' ? 'Troop growth' : 'No troop growth'}</span></div>
      <button type="button" className="city-controls__close" aria-label="Close city controls" onClick={props.onClose}>×</button>
    </div>
    <div className="city-controls__types" role="group" aria-label="Convert city">
      {model.types.map(type => <button key={type.type} type="button" aria-pressed={type.current}
        disabled={type.disabled} aria-describedby={`${id}-${type.type}`} onClick={() => {
          if (!type.disabled) props.onConvert(type.type);
        }}>
        <span>{type.label}</span><small>{type.current ? 'Current · no charge' : `${type.cost} troops`}</small>
      </button>)}
    </div>
    {model.types.map(type => <span className="city-controls__sr" id={`${id}-${type.type}`} key={type.type}>
      {type.reason || `Convert to ${type.label} for ${type.cost} troops; leave 1 behind.`}
    </span>)}
    <p className="city-controls__reason">{model.reason}</p>
    <div className="city-controls__flight">
      <span id={`${id}-plane`}>{model.planeText}{props.detail ? ` · ${props.detail}` : ''}</span>
      {props.targeting ? <button type="button" onClick={props.onCancel}>Cancel</button> : <>
        {props.cityType === 'airfield' && <button type="button" className="city-controls__fly"
          disabled={model.flyDisabled} aria-describedby={`${id}-fly ${id}-plane`} onClick={props.onFly}>Fly</button>}
        <button type="button" disabled={model.groundDisabled} aria-describedby={`${id}-ground`} onClick={props.onGround}>Ground…</button>
      </>}
    </div>
    <span className="city-controls__sr" id={`${id}-fly`}>{model.flyReason}</span>
    <span className="city-controls__sr" id={`${id}-ground`}>Send by ground; leave 1 troop. Drag orders remain available.</span>
    {props.targeting && <p className="city-controls__reason" role="status">{props.targeting === 'fly'
      ? 'Tap any other city to fly · Cancel or Escape to exit'
      : 'Choose a city for ground dispatch · Cancel or Escape to exit'}</p>}
  </section>;
}
