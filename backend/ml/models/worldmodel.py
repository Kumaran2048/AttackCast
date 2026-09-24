import torch
from torch import nn

class WorldModel(nn.Module):
    def __init__(self,input_size,hidden=64,classes=8):
        super().__init__()
        self.encoder=nn.Sequential(nn.Linear(input_size,hidden),nn.ReLU(),nn.Dropout(.1))
        self.gru=nn.GRU(hidden,hidden,batch_first=True)
        self.attn=nn.Linear(hidden,1)
        self.head=nn.Linear(hidden,classes)
    def forward(self,x):
        z=self.encoder(x); h,_=self.gru(z)
        a=torch.softmax(self.attn(h).squeeze(-1),dim=1)
        pooled=(h*a.unsqueeze(-1)).sum(dim=1)
        return self.head(pooled), pooled, a
