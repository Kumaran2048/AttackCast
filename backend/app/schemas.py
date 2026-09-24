from typing import Dict,List,Optional,Literal
from pydantic import BaseModel,Field

class State(BaseModel):
    id:int; name:str; attack_id:Optional[str]=None; confidence:str="high"
class Horizon(BaseModel):
    k:int; state_probs:Dict[str,float]; reach_probs:Dict[str,float]
class Forecast(BaseModel):
    K:int; horizons:List[Horizon]; top_paths:List[dict]; uncertain:bool=False; temperature:float=1.; ensemble_disagreement:float=0.
class Explanation(BaseModel):
    top_features:List[dict]; attention:List[float]; flagged_flows:List[dict]; text:str
class Alert(BaseModel):
    level:Literal["none","watch","warning","critical"]; reason:str; lead_estimate_windows:int
class Countermeasure(BaseModel):
    action:str; mitigation_id:str; rationale:str
class WindowUpdate(BaseModel):
    session_id:str; window_id:int; t_start:str; t_end:str; entity:str
    sequence_origin:Literal["natural","synthetic"]
    current_state:State; ground_truth_state:Optional[dict]
    forecast:Forecast; alert:Alert; explanation:Explanation; countermeasures:List[Countermeasure]
class Scenario(BaseModel):
    id:str; title:str; origin:Literal["natural","synthetic"]; duration_seconds:int; ground_truth_stage_timeline:List[dict]
class ReplayStartRequest(BaseModel):
    scenario_id:str; speed:float=Field(5,ge=.1,le=50); window_seconds:int=Field(30,ge=1); K:int=Field(5,ge=1,le=20)
class WhatIfRequest(BaseModel):
    session_id:str; window_id:int; action:str; target:str
